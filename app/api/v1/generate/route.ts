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

async function resolveApiKey(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const rawKey = auth.slice(7).trim()

  // Find active keys whose prefix matches (narrows the bcrypt search)
  const prefix = rawKey.substring(0, 16)
  const candidates = await prisma.apiKey.findMany({
    where:   { keyPrefix: { startsWith: prefix }, revokedAt: null },
    include: { user: true },
  })

  for (const k of candidates) {
    if (await bcrypt.compare(rawKey, k.keyHash)) {
      // Update lastUsedAt (fire-and-forget)
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
    // SECURITY: Destructure `geminiApiKey` last and never log the full body.
    // Preferred path: use the server-level GEMINI_API_KEY env var so the client
    // never needs to send their key. The client-supplied key is a fallback for
    // developers who haven't configured the server key yet.
    // TODO (R7): Store the user's Gemini key encrypted in the DB (UserSettings)
    //            so it doesn't transit the wire on every request.
    const { mode = 'carousel', topic, slideCount = 5, tone = 'viral', audience, geminiApiKey } = await req.json()

    if (!topic) return NextResponse.json({ error: 'topic is required' }, { status: 400 })

    // Resolve API key: prefer server env var, fall back to client-supplied key.
    // The client-supplied key is NEVER logged — only the resolved source is logged.
    const resolvedGeminiKey = process.env.GEMINI_API_KEY ?? geminiApiKey
    if (!resolvedGeminiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key available. Either set GEMINI_API_KEY on the server or pass geminiApiKey in the request body.' },
        { status: 400 }
      )
    }
    const keySource = process.env.GEMINI_API_KEY ? 'server-env' : 'client-supplied'
    // Log source but never the key value
    console.log(`[api/v1/generate] user=${user.id} keySource=${keySource} mode=${mode}`)

    // Check plan / credits
    const check = await checkCanGenerate(user.id, 'api_call', slideCount)
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 402 })
    }

    const audienceStr = audience || 'empreendedores e criadores de conteúdo'

    const genAI = new GoogleGenerativeAI(resolvedGeminiKey)
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
    // Log error without risk of exposing key material from the exception chain
    console.error('V1 API error:', e?.message ?? String(e))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
