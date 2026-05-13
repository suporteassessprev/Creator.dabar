import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { fillTemplate } from '@/lib/prompt-service'

// POST /api/admin/prompts/test-anonymous
// Used to test a prompt template that hasn't been saved yet (new prompt form)
export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { apiKey, vars = {}, content } = await req.json()
    if (!apiKey)   return NextResponse.json({ error: 'apiKey obrigatório' }, { status: 400 })
    if (!content)  return NextResponse.json({ error: 'content obrigatório' }, { status: 400 })

    const filled = fillTemplate(content, {
      topic:       vars.topic       ?? 'Exemplo de tema para teste',
      tone:        vars.tone        ?? 'viral',
      audience:    vars.audience    ?? 'empreendedores',
      slideCount:  vars.slideCount  ?? '5',
      imagePrompt: vars.imagePrompt ?? 'professional business scene',
    })

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(filled)
    const output = result.response.text()

    return NextResponse.json({ filled, output })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
