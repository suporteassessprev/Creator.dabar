import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { fillTemplate } from '@/lib/prompt-service'
import {
  getServerGeminiKey,
  GeminiKeyMissingError,
  MISSING_GEMINI_KEY_MESSAGE,
} from '@/lib/gemini'

// POST /api/admin/prompts/test-anonymous
// Used to test a prompt template that hasn't been saved yet (new prompt form)
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // SECURITY: never read or honor a client-supplied apiKey.
    const { vars = {}, content } = await req.json()
    if (!content)  return NextResponse.json({ error: 'content obrigatório' }, { status: 400 })

    const filled = fillTemplate(content, {
      topic:       vars.topic       ?? 'Exemplo de tema para teste',
      tone:        vars.tone        ?? 'viral',
      audience:    vars.audience    ?? 'empreendedores',
      slideCount:  vars.slideCount  ?? '5',
      imagePrompt: vars.imagePrompt ?? 'professional business scene',
    })

    const genAI = new GoogleGenerativeAI(getServerGeminiKey())
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(filled)
    const output = result.response.text()

    return NextResponse.json({ filled, output })
  } catch (e: any) {
    if (e instanceof GeminiKeyMissingError) {
      return NextResponse.json({ error: MISSING_GEMINI_KEY_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ error: 'Erro ao testar prompt' }, { status: 500 })
  }
}
