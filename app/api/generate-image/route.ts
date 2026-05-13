import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildPrompt } from '@/lib/prompt-service'
import { getSession } from '@/lib/auth'
import { checkCanGenerate, consumeCredit } from '@/lib/billing'

async function generateImage(
  enhancedPrompt: string,
  apiKey: string
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
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
  } catch (err) {
    console.error('Image generation error:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, apiKey, mode = 'carousel' } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key não fornecida' }, { status: 400 })
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

    // Use DB-driven prompt template (falls back to hardcoded default)
    const promptType = mode === 'creative' ? 'creative_image' : 'carousel_image'
    const enhancedPrompt = await buildPrompt(promptType, { imagePrompt: prompt })

    const imageData = await generateImage(enhancedPrompt, apiKey)

    if (!imageData) {
      return NextResponse.json({ error: 'Não foi possível gerar a imagem' }, { status: 500 })
    }

    // Deduct credit + log
    if (session) {
      await consumeCredit(session.userId, 'generate_image', {
        mode,
        description: `Imagem gerada (${mode})`,
      })
    }

    return NextResponse.json({ imageData })
  } catch (error: any) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar imagem' },
      { status: 500 }
    )
  }
}
