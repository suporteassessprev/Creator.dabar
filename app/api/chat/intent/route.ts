/**
 * POST /api/chat/intent
 *
 * Conversational intent-collection for the new chat-style generator.
 * The bot asks short, targeted follow-up questions until it has enough
 * info to confidently start generation. At that point it returns a
 * structured "intent" JSON that the frontend uses to call the existing
 * /api/generate + /api/generate-image pipeline.
 *
 * Body:
 *   {
 *     mode: 'creative' | 'carousel',
 *     messages: Array<{ role: 'user' | 'assistant', content: string }>
 *   }
 *
 * Response (one of):
 *   { type: 'question', message: string }
 *   { type: 'intent', intent: { tema, audience, tone, slideCount?, extraContext? } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  getServerGeminiKey,
  GeminiKeyMissingError,
  MISSING_GEMINI_KEY_MESSAGE,
} from '@/lib/gemini'

const SYSTEM_PROMPT = (mode: 'creative' | 'carousel') => `
Você é uma IA assistente que ajuda usuários a criar ${mode === 'carousel' ? 'CARROSSÉIS' : 'CRIATIVOS de anúncio'} virais pra redes sociais.

Sua missão: entender em até 2-3 mensagens curtas O QUE o usuário quer postar, PRA QUEM, e EM QUE TOM. Depois disso, GERE.

REGRAS:
1. Faça NO MÁXIMO 3 perguntas. Depois disso INFIRA o que faltou e gere.
2. UMA pergunta por mensagem. Curta. Sem floreio.
3. Tom amigável mas direto. Como um amigo designer.
4. Se o usuário já deu detalhes suficientes na 1ª mensagem, NÃO pergunte nada — vá direto pro intent.
5. NÃO faça perguntas óbvias se a resposta está implícita (ex: se ele disse "curso de tarot pra mulheres 30+", não pergunte público).

QUANDO TIVER INFO SUFICIENTE, retorne ESTE JSON exato (sem markdown, sem texto antes/depois):
{
  "ready": true,
  "tema": "frase curta resumindo o tema principal",
  "audience": "descrição do público-alvo (você infere se preciso)",
  "tone": "viral|educativo|motivacional|profissional|humoristico",
  "slideCount": ${mode === 'carousel' ? '7' : '1'},
  "extraContext": "qualquer detalhe específico que enriqueça"
}

ENQUANTO NÃO tiver info suficiente, retorne ESTE JSON:
{
  "ready": false,
  "ask": "sua pergunta curta aqui"
}

⚡ CRÍTICO:
- SEMPRE retorne um dos 2 JSONs acima. NUNCA texto livre.
- "ready: true" assim que tiver TEMA + (PÚBLICO inferido ou explícito) + tom razoável.
- Default tom = "viral" se não souber.
- Default audience = inferir do tema (ex: "tarot" → "mulheres 25-45 interessadas em espiritualidade").
- NÃO perca tempo perguntando coisas que pode inferir.
`.trim()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const mode: 'creative' | 'carousel' = body.mode === 'carousel' ? 'carousel' : 'creative'
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []

    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages é obrigatório (array com pelo menos uma user message)' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(getServerGeminiKey())
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT(mode),
    })

    // Convert messages to Gemini format (user/model alternating).
    // We invert assistant→model.
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'última mensagem deve ser do user' }, { status: 400 })
    }

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)
    const text = result.response.text().trim()

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback: treat as a question
      return NextResponse.json({ type: 'question', message: text })
    }

    let parsed: any
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ type: 'question', message: text })
    }

    if (parsed?.ready === true && parsed.tema) {
      return NextResponse.json({
        type: 'intent',
        intent: {
          tema:         String(parsed.tema),
          audience:     String(parsed.audience ?? 'pessoas interessadas no tema'),
          tone:         ['viral','educativo','motivacional','profissional','humoristico'].includes(parsed.tone) ? parsed.tone : 'viral',
          slideCount:   mode === 'carousel' ? (Number.isFinite(parsed.slideCount) ? Math.max(3, Math.min(10, parsed.slideCount)) : 7) : 1,
          extraContext: parsed.extraContext ? String(parsed.extraContext) : null,
        },
      })
    }

    if (parsed?.ready === false && parsed.ask) {
      return NextResponse.json({ type: 'question', message: String(parsed.ask) })
    }

    // Unknown shape — treat as question
    return NextResponse.json({ type: 'question', message: text })
  } catch (e: any) {
    if (e instanceof GeminiKeyMissingError) {
      return NextResponse.json({ error: MISSING_GEMINI_KEY_MESSAGE }, { status: 503 })
    }
    console.error('[api/chat/intent] error:', e?.message ?? 'unknown')
    return NextResponse.json({ error: e?.message ?? 'Erro' }, { status: 500 })
  }
}
