import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildPrompt } from '@/lib/prompt-service'
import { getSession } from '@/lib/auth'
import { checkCanGenerate, consumeCredit } from '@/lib/billing'

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
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
    const { mode, topic, slideCount, tone, targetAudience, apiKey } = body

    if (!apiKey) return NextResponse.json({ error: 'Chave de API do Gemini não fornecida' }, { status: 400 })
    if (!topic)  return NextResponse.json({ error: 'Tema é obrigatório' }, { status: 400 })

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
      const text     = await callGemini(apiKey, prompt)
      const creative = extractJson(text) as {
        headline: string; subtitle: string; cta: string; imagePrompt: string
      }

      // Deduct credit + log
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
    const text   = await callGemini(apiKey, prompt)
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
    console.error('Generate error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao gerar conteúdo' }, { status: 500 })
  }
}
