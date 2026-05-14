import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildPrompt } from '@/lib/prompt-service'
import { getSession } from '@/lib/auth'
import { checkCanGenerate, consumeCredit } from '@/lib/billing'
import {
  getServerGeminiKey,
  GeminiKeyMissingError,
  MISSING_GEMINI_KEY_MESSAGE,
} from '@/lib/gemini'

async function callGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(getServerGeminiKey())
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA. Tente novamente.')
  return JSON.parse(match[0])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // SECURITY: never read or honor a client-supplied apiKey/geminiApiKey.
    const { mode, topic, slideCount, tone, targetAudience } = body

    if (!topic) return NextResponse.json({ error: 'Tema é obrigatório' }, { status: 400 })

    // ── Plan & credit check ──────────────────────────────────
    const session = await getSession()
    if (session) {
      const check = await checkCanGenerate(
        session.userId,
        'generate_text',
        mode === 'carousel' ? (slideCount ?? 7) : 1
      )
      if (!check.allowed) {
        return NextResponse.json(
          { error: check.reason, upgradeRequired: check.upgradeRequired },
          { status: 402 }
        )
      }
    }

    const toneStr     = tone           || 'viral'
    const audienceStr = targetAudience || 'empreendedores e criadores de conteúdo'

    if (mode === 'creative') {
      const prompt = await buildPrompt('creative_copy', {
        topic, tone: toneStr, audience: audienceStr,
      })
      const text     = await callGemini(prompt)
      const creative = extractJson(text) as {
        headline: string; subtitle: string; cta: string; imagePrompt: string
      }

      if (session) {
        await consumeCredit(session.userId, 'generate_text', {
          mode: 'creative', topic,
          description: `Criativo: ${topic.substring(0, 80)}`,
        })
      }

      return NextResponse.json({ mode: 'creative', creative })
    }

    // carousel
    const prompt = await buildPrompt('carousel_copy', {
      topic, tone: toneStr, audience: audienceStr,
      slideCount: String(slideCount || 7),
    })
    const text   = await callGemini(prompt)
    const parsed = extractJson(text) as { title: string; slides: unknown[] }

    if (session) {
      await consumeCredit(session.userId, 'generate_text', {
        mode: 'carousel', topic,
        description: `Carrossel: ${topic.substring(0, 80)}`,
        metadata: { slideCount: slideCount || 7 },
      })
    }

    return NextResponse.json({ mode: 'carousel', ...parsed })
  } catch (error: any) {
    if (error instanceof GeminiKeyMissingError) {
      console.error('[api/generate] GEMINI_API_KEY missing')
      return NextResponse.json({ error: MISSING_GEMINI_KEY_MESSAGE }, { status: 503 })
    }
    // Log only the message — avoid serializing full error objects that may
    // contain request/response payloads with the key.
    console.error('Generate error:', error?.message ?? 'unknown')
    return NextResponse.json(
      { error: 'Erro ao gerar conteúdo. Tente novamente.' },
      { status: 500 }
    )
  }
}
