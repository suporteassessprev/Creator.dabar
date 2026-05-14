/**
 * Public REST API — authenticated via Bearer API key.
 * POST /api/v1/generate
 * Header: Authorization: Bearer vp_live_<key>
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildPrompt } from '@/lib/prompt-service'
import { checkCanGenerate, consumeCredit } from '@/lib/billing'
import { GoogleGenerativeAI } from '@google/generative-ai'
import bcrypt from 'bcryptjs'
import {
  getServerGeminiKey,
  GeminiKeyMissingError,
  MISSING_GEMINI_KEY_MESSAGE,
} from '@/lib/gemini'

async function resolveApiKey(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const rawKey = auth.slice(7).trim()

  const prefix = rawKey.substring(0, 16)
  const candidates = await prisma.apiKey.findMany({
    where:   { keyPrefix: { startsWith: prefix }, revokedAt: null },
    include: { user: true },
  })

  for (const k of candidates) {
    if (await bcrypt.compare(rawKey, k.keyHash)) {
      prisma.apiKey.update({ where: { id: k.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
      return k.user
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const user = await resolveApiKey(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Provide a valid Bearer API key.' }, { status: 401 })
  }

  try {
    // SECURITY: never read or honor a client-supplied geminiApiKey.
    const { mode = 'carousel', topic, slideCount = 5, tone = 'viral', audience } = await req.json()

    if (!topic) return NextResponse.json({ error: 'topic is required' }, { status: 400 })

    // Server-managed Gemini key only. Resolves from env or throws.
    const geminiKey = getServerGeminiKey()
    console.log(`[api/v1/generate] user=${user.id} mode=${mode}`)

    const check = await checkCanGenerate(user.id, 'api_call', slideCount)
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 402 })
    }

    const audienceStr = audience || 'empreendedores e criadores de conteúdo'

    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    let result: unknown

    if (mode === 'creative') {
      const prompt = await buildPrompt('creative_copy', { topic, tone, audience: audienceStr })
      const text   = await model.generateContent(prompt).then(r => r.response.text())
      const match  = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Invalid AI response')
      result = JSON.parse(match[0])
    } else {
      const prompt = await buildPrompt('carousel_copy', {
        topic, tone, audience: audienceStr, slideCount: String(slideCount),
      })
      const text   = await model.generateContent(prompt).then(r => r.response.text())
      const match  = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Invalid AI response')
      result = JSON.parse(match[0])
    }

    await consumeCredit(user.id, 'api_call', {
      mode, topic,
      description: `API call: ${topic.substring(0, 80)}`,
      metadata:    { slideCount },
    })

    return NextResponse.json({ ok: true, mode, result })
  } catch (e: any) {
    if (e instanceof GeminiKeyMissingError) {
      console.error('[api/v1/generate] GEMINI_API_KEY missing')
      return NextResponse.json({ error: MISSING_GEMINI_KEY_MESSAGE }, { status: 503 })
    }
    // Log only the message — never the full error (may contain key material).
    console.error('V1 API error:', e?.message ?? 'unknown')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
