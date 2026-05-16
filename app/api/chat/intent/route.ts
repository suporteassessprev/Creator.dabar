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
Você é uma IA assistente que ajuda criadores brasileiros a fazer ${mode === 'carousel' ? 'CARROSSÉIS virais (vários slides)' : 'CRIATIVOS de anúncio (post único)'} pra Instagram, TikTok e LinkedIn.

Sua missão: entender em até 1-3 mensagens curtas O QUE o usuário quer postar, PRA QUEM, e EM QUE TOM. Depois disso, GERE.

ESTRATÉGIA DE ENTENDIMENTO (siga nessa ordem):
1. Leia atentamente a mensagem do usuário — interpretação NATURAL, não literal.
2. EXTRAIA o que está EXPLÍCITO (tema, público se mencionado).
3. INFIRA o que está IMPLÍCITO usando contexto brasileiro:
   - "auxílio maternidade pra gestantes desempregadas" → tema=auxílio maternidade; público=gestantes em situação de vulnerabilidade financeira; tom=informativo/profissional
   - "curso de tarot" → público=mulheres 25-45 espiritualistas; tom=místico/viral
   - "consultoria de produtividade" → público=empreendedores; tom=profissional
   - Termos jurídicos/INSS/benefícios → tom=profissional, público=pessoa elegível
4. SÓ pergunte se faltar info CRÍTICA que você NÃO consegue inferir com confiança.
5. Nunca pergunte coisas óbvias ou que o usuário acabou de dizer.

REGRAS DURAS:
- MÁXIMO 3 perguntas no total. Depois disso, INFIRA o que faltar e GERE.
- 1 pergunta por mensagem. Curta. Sem floreio.
- Tom amigável e direto, como um amigo designer.
- Se a 1ª mensagem do usuário JÁ tem tema + público (mesmo implícito), pule direto pro intent.

QUANDO TIVER INFO SUFICIENTE, retorne ESTE JSON exato (sem markdown, sem texto antes/depois):
{
  "ready": true,
  "tema": "frase curta resumindo o tema principal",
  "audience": "descrição clara do público-alvo (inferido se necessário)",
  "tone": "viral|educativo|motivacional|profissional|humoristico",
  "slideCount": ${mode === 'carousel' ? '7' : '1'},
  "extraContext": "qualquer detalhe específico que enriqueça a copy/imagem"
}

ENQUANTO NÃO tiver, retorne:
{
  "ready": false,
  "ask": "sua pergunta curta aqui (PT-BR)"
}

⚡ CRÍTICO:
- SEMPRE retorne um dos 2 JSONs acima. NUNCA texto livre fora deles.
- "ready: true" assim que tiver TEMA + público (mesmo inferido) + tom razoável.
- Default tom = "viral" se não souber.
- Default público = inferir do tema.
- PRIORIZE gerar logo. Ninguém quer ficar respondendo perguntas.
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
    // Use Pro for chat intent — much better at understanding nuance,
    // inferring implicit info, and writing natural follow-up questions
    // in PT-BR. The cost is fine since this is per-conversation, not
    // per-asset, and usually only 1-3 turns per session.
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      systemInstruction: SYSTEM_PROMPT(mode),
    })

    // Convert messages to Gemini format. Gemini requires history to
    // START with a 'user' role. The frontend often prepends an
    // assistant greeting bubble that exists ONLY for UX — we strip
    // those leading assistant messages here before passing to the API.
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'última mensagem deve ser do user' }, { status: 400 })
    }
    const rawHistory = messages.slice(0, -1)
    // Drop leading assistant messages until we hit a user (or empty)
    let startIdx = 0
    while (startIdx < rawHistory.length && rawHistory[startIdx].role !== 'user') startIdx++
    const history = rawHistory.slice(startIdx).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

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
