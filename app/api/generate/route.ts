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
import { sanitizeErrorMessage } from '@/lib/sanitize-error'
import { extractJsonFromAi } from '@/lib/extract-json'

async function callGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(getServerGeminiKey())
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// extractJson moved to lib/extract-json.ts (extractJsonFromAi).

/** Returns true when v is a non-empty trimmed string. */
function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Validates a creative_copy response shape. The admin-customized
 * prompt might return JSON with the wrong key names ("titulo" instead
 * of "headline") or empty values — that used to land the user in the
 * editor with everything blank and a broken image_slot. Catch it here.
 */
function validateCreative(c: any, promptSnippet: string): void {
  if (!c || typeof c !== 'object') {
    throw new Error(
      `IA retornou resposta sem objeto JSON. Verifique seu prompt em /admin/prompts → creative_copy — ele precisa pedir um JSON com chaves "headline", "subtitle", "cta", "imagePrompt". Prompt enviado começa com: "${promptSnippet}"`
    )
  }
  const missing: string[] = []
  if (!nonEmpty(c.headline))    missing.push('headline')
  if (!nonEmpty(c.subtitle))    missing.push('subtitle')
  if (!nonEmpty(c.imagePrompt)) missing.push('imagePrompt')
  if (missing.length > 0) {
    throw new Error(
      `IA retornou JSON sem os campos obrigatórios: ${missing.join(', ')}. Verifique seu prompt em /admin/prompts → creative_copy — ele precisa pedir um JSON com chaves "headline", "subtitle", "cta", "imagePrompt".`
    )
  }
}

function validateCarousel(p: any): void {
  if (!p || typeof p !== 'object' || !Array.isArray(p.slides) || p.slides.length === 0) {
    throw new Error(
      'IA retornou resposta sem o array "slides". Verifique seu prompt em /admin/prompts → carousel_copy — ele precisa pedir um JSON com "title" e "slides" (array de {title, content, imagePrompt}).'
    )
  }
  const emptySlide = p.slides.find((s: any) =>
    !nonEmpty(s?.title) || !nonEmpty(s?.content) || !nonEmpty(s?.cta)
  )
  if (emptySlide) {
    throw new Error(
      'Pelo menos um slide veio sem title, content ou CTA. Como cada criativo é independente em "Criativos em Massa", todos precisam ter cta. Verifique seu prompt carousel_copy.'
    )
  }
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
      const creative = extractJsonFromAi(text) as {
        headline: string; subtitle: string; cta: string; imagePrompt: string
      }
      validateCreative(creative, prompt.slice(0, 120).replace(/\s+/g, ' '))

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
    const parsed = extractJsonFromAi(text) as { title: string; slides: unknown[] }
    validateCarousel(parsed)

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
    const detail = sanitizeErrorMessage(error, 'Erro ao gerar conteúdo. Tente novamente.')
    console.error('Generate error:', detail)
    return NextResponse.json(
      { error: `Erro ao gerar conteúdo: ${detail}` },
      { status: 500 }
    )
  }
}
