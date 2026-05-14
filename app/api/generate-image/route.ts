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

async function generateImage(enhancedPrompt: string): Promise<string | null> {
  const genAI = new GoogleGenerativeAI(getServerGeminiKey())
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
  })
  for (const part of result.response.candidates?.[0]?.content?.parts || []) {
    if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
      const { mimeType, data } = (part as any).inlineData
      return `data:${mimeType};base64,${data}`
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // SECURITY: never read or honor a client-supplied apiKey.
    const { prompt, mode = 'carousel' } = body

    if (!prompt) {
      return NextResponse.json({ error: 'prompt é obrigatório' }, { status: 400 })
    }

    // ── Plan & credit check ──────────────────────────────────
    const session = await getSession()
    if (session) {
      const check = await checkCanGenerate(session.userId, 'generate_image')
      if (!check.allowed) {
        return NextResponse.json(
          { error: check.reason, upgradeRequired: check.upgradeRequired },
          { status: 402 }
        )
      }
    }

    const promptType = mode === 'creative' ? 'creative_image' : 'carousel_image'
    const enhancedPrompt = await buildPrompt(promptType, { imagePrompt: prompt })

    const imageData = await generateImage(enhancedPrompt)

    if (!imageData) {
      return NextResponse.json({ error: 'Não foi possível gerar a imagem' }, { status: 500 })
    }

    if (session) {
      await consumeCredit(session.userId, 'generate_image', {
        mode,
        description: `Imagem gerada (${mode})`,
      })
    }

    return NextResponse.json({ imageData })
  } catch (error: any) {
    if (error instanceof GeminiKeyMissingError) {
      console.error('[api/generate-image] GEMINI_API_KEY missing')
      return NextResponse.json({ error: MISSING_GEMINI_KEY_MESSAGE }, { status: 503 })
    }
    console.error('Image generation error:', error?.message ?? 'unknown')
    return NextResponse.json(
      { error: 'Erro ao gerar imagem. Tente novamente.' },
      { status: 500 }
    )
  }
}
