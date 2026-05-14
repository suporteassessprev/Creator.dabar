import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { fillTemplate } from '@/lib/prompt-service'
import {
  getServerGeminiKey,
  GeminiKeyMissingError,
  MISSING_GEMINI_KEY_MESSAGE,
} from '@/lib/gemini'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return null
  return session
}

// POST /api/admin/prompts/[id]/test
// body: { vars: Record<string,string>, content?: string }
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await checkAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // SECURITY: never read or honor a client-supplied apiKey.
    const { vars = {}, content: overrideContent } = await req.json()

    let template: string

    if (overrideContent) {
      template = overrideContent
    } else {
      const prompt = await prisma.promptConfig.findUnique({ where: { id: params.id } })
      if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
      template = prompt.content
    }

    const filled = fillTemplate(template, {
      topic:      vars.topic      ?? 'Exemplo de tema para teste',
      tone:       vars.tone       ?? 'viral',
      audience:   vars.audience   ?? 'empreendedores',
      slideCount: vars.slideCount ?? '5',
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
