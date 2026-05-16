/**
 * Phase 3.1d — AI template extraction from image (Gemini Vision).
 *
 * Given an uploaded reference image (a screenshot of a viral creative,
 * ad, or social post), call Gemini with a structured prompt that
 * asks the model to reverse-engineer the layout into a JSON matching
 * our TemplateStructure schema.
 *
 * The output is best-effort. Gemini's color/font detection isn't pixel
 * perfect, so the admin still needs to fine-tune in the visual editor.
 * The goal is to skip the tedious "build from scratch" step.
 */
import { TemplateStructure, validateStructure, parseStructure } from './template-structure'
import { ICON_NAMES } from './template-icons'

export const EXTRACT_TEMPLATE_PROMPT = `
Você é um analisador especialista em design de templates de redes sociais e anúncios virais. Analise a imagem fornecida MINUCIOSAMENTE e retorne um JSON puro descrevendo a estrutura visual em formato editável.

⚡ PRIORIDADES MÁXIMAS (não erre):
1. GRADIENTE no fundo — se o fundo tem QUALQUER transição de cor (mesmo sutil), USE \`linear-gradient(...)\` ou \`radial-gradient(...)\` no fill do background, NUNCA simplifique para cor sólida.
2. TAMANHO REAL das fontes — observe a proporção visual. Headline gigantesco = fontSize 80-120. Body normal = 18-28. Footer pequeno = 12-16.
3. FONTE CORRETA — analise CARACTERÍSTICAS VISUAIS: condensada/larga, serif/sans, peso, contraste. Combine com a tabela de fontes abaixo.
4. ACCENT COLOR — palavras em cor diferente dentro do mesmo headline devem ser envolvidas por *asteriscos*.
5. POSIÇÃO PROPORCIONAL — TODAS posições em PORCENTAGEM (0-100). Meça a altura do texto como % da altura do canvas.

REGRAS GERAIS:
- Cores em hex (#RRGGBB) ou rgba(r,g,b,a) quando houver transparência.
- Identifique formato: "1:1" (quadrado), "4:5" (feed vertical), ou "9:16" (story).
- Identifique TODOS elementos visíveis — incluindo bordas decorativas, cantos coloridos, divisores.
- IDs únicos descritivos. zIndex crescente do fundo (0) pros textos (10+).

🎨 DETECÇÃO DE GRADIENTE (importante!):
- Se você vê QUALQUER variação de tom no fundo (mais escuro num canto, mais claro noutro), É GRADIENTE.
- Padrões comuns:
  - Gradient diagonal: \`linear-gradient(135deg, #cor1 0%, #cor2 100%)\`
  - Gradient horizontal: \`linear-gradient(90deg, ...)\`
  - Gradient vertical: \`linear-gradient(180deg, ...)\`
  - Spotlight radial: \`radial-gradient(circle at 50% 30%, #claro 0%, #escuro 80%)\`
- Identifique 2-3 cores do gradient com base nos extremos.

📝 DETECÇÃO DE FONTE — características visuais:
- **Bebas Neue / Anton / Oswald**: SANS condensada (estreita), maiúsculas dominantes, peso alto (900). Use pra headlines grandes "GERE *IMAGENS*".
- **Archivo Black / Inter Black (weight 900)**: SANS larga e geométrica, muito pesada. Headlines impacto blocos.
- **Playfair Display / DM Serif Display / Merriweather**: SERIF clássica, contraste alto entre traços. Headlines elegantes.
- **Poppins / Montserrat / Lato**: SANS humanista arredondada. Pra body, médio.
- **Inter / Work Sans / Roboto**: SANS neutra moderna. Body text, parágrafos.
- **Permanent Marker / Caveat / Patrick Hand**: HANDWRITING / brush. Decorativo.
- **Bungee / Rubik Mono One**: SANS quadradona, bloco. Headlines retrô.

PESO DA FONTE — observe o traço visual:
- 400 normal · 500 medium · 600 semibold · 700 bold · 800 extrabold · 900 black
- Headlines virais geralmente 800-900. Body 400-500. CTA 600-700.

TIPOS DE ELEMENTO:
1. background — Cor sólida OU gradient (linear/radial). USE GRADIENT quando aplicável.
2. text_headline — Título principal grande. Suporta *asterisk highlight*. fontSize 60-120 dependendo do destaque.
3. text_subtitle — Texto médio (body, descrição). fontSize 18-32.
4. text_cta — Botão pílula com background + padding + borderRadius. Ex: "Clique em saiba mais".
5. badge — Pílula pequena decorativa.
6. account_badge — Avatar circular + @handle.
7. image_static — Imagem FIXA (foto, mockup, logo). src: "PLACEHOLDER".
8. image_slot — APENAS placeholder pra imagem futura genérica. Description explicativa.
9. icon — Ícone vetorial. iconName de: ${ICON_NAMES.join(', ')}.
10. shape — Retângulo/círculo decorativo. Pode ter borderColor (cantos coloridos como em advocacia).

CAMPOS:
- text_*: { placeholder, fontFamily, fontSize, fontWeight, color, accentColor?, align, lineHeight, background?, borderRadius?, paddingX?, paddingY? }
- account_badge: { handle, fontFamily, fontSize, fontWeight, color, avatarSize }
- image_static: { src: "PLACEHOLDER", objectFit, borderRadius, alt }
- image_slot: { description, objectFit, borderRadius, overlay? }
- icon: { iconName, color, strokeWidth?, background?, borderRadius?, paddingX?, paddingY? }
- shape: { shape: "rectangle"|"circle", fill, borderRadius?, borderColor?, borderWidth?, opacity? }
- background: { fill }

EXEMPLO COM GRADIENT + ACCENT:
{
  "version": 1,
  "canvas": { "format": "1:1", "backgroundColor": "#0f172a" },
  "elements": [
    { "id": "bg", "type": "background", "x": 0, "y": 0, "width": 100, "height": 100, "zIndex": 0, "fill": "linear-gradient(135deg, #ff00ea 0%, #d946ef 50%, #f0abfc 100%)" },
    { "id": "hl", "type": "text_headline", "x": 5, "y": 15, "width": 90, "height": 28, "zIndex": 10, "placeholder": "Mamãe, você conhece o *AUXÍLIO MATERNIDADE*?", "fontFamily": "Archivo Black", "fontSize": 96, "fontWeight": 900, "color": "#ffffff", "accentColor": "#ffffff", "align": "left", "lineHeight": 1.0 }
  ]
}

INSTRUÇÕES FINAIS:
- Retorne APENAS o JSON. SEM markdown, sem texto antes/depois.
- IDs únicos curtos ("bg", "hl1", "sub1", "cta1").
- Posições aproximadas mas proporcionais — o admin refina.
- Quando em dúvida sobre gradient, ASSUMA que tem (raro um design ter cor sólida 100%).
- Quando em dúvida sobre fonte, escolha a MAIS PRÓXIMA visualmente da tabela acima.
`.trim()

export interface ExtractionResult {
  structure: TemplateStructure
  notes?: string
}

/**
 * Step 1 prompt: describe in natural language what's visible. Forces
 * Gemini to reason about colors/fonts/proportions before committing
 * to JSON. Chain-of-thought tends to produce more accurate JSON.
 */
const DESCRIBE_PROMPT = `
Você é um analisador especialista em design. Olhe a imagem MUITO atentamente e descreva em texto livre (em português) os seguintes aspectos. SEJA ESPECÍFICO E DETALHADO.

1. FORMATO do canvas (1:1, 4:5 ou 9:16) e dimensões aproximadas.

2. FUNDO:
   - É cor sólida ou GRADIENT? Se gradient, descreva as cores e direção (linear/radial, ângulo).
   - Há uma FOTO/IMAGEM atrás do design? (ex: silhueta de pessoa, paisagem desfocada)
   - Se sim, descreva a foto e como ela se mistura com a cor (overlay, opacidade).

3. TEXTOS — pra CADA bloco de texto:
   - Conteúdo aproximado
   - Tamanho visual (gigante/grande/médio/pequeno)
   - Cor (hex aproximado)
   - Fonte (descreva características: serif/sans, condensada/larga, peso 400-900, formato)
   - Posição (topo/meio/baixo, esquerda/centro/direita)
   - Alguma palavra em cor diferente? (accent)

4. ELEMENTOS GRÁFICOS:
   - Pílulas/botões CTA (cor, texto, ícone interno)
   - Caixas coloridas de destaque (R$, valores)
   - Avatar + handle (@perfil)
   - Bordas decorativas, cantos, divisores
   - Ícones (check, info, seta...)

5. PROPORÇÕES:
   - Que % da altura o headline ocupa?
   - Que % o CTA ocupa?
   - Espaçamento entre elementos (justo/médio/largo)

Retorne SÓ a descrição em texto. Sem JSON ainda.
`.trim()

/**
 * Call Gemini Vision with the prompt + image and parse the response.
 * Returns a validated TemplateStructure or throws with a user-readable error.
 *
 * Strategy:
 * 1. Step 1 (describe): Gemini Pro describes the image in detail. This
 *    chain-of-thought reasoning massively improves extraction quality
 *    for gradients, fonts, proportions.
 * 2. Step 2 (convert): same model, feeds description + image + JSON
 *    schema prompt → outputs structured TemplateStructure.
 */
export async function extractTemplateFromImage(
  imageDataUrl: string,
  geminiApiKey: string
): Promise<TemplateStructure> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(geminiApiKey)
  // Pro is much better than Flash at visual extraction (worth the extra
  // cost since this is an admin one-off action, not a hot path).
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

  // Convert data URL to base64 + mime
  const match = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/)
  if (!match) throw new Error('Imagem inválida (esperado data URL)')
  const mimeType = match[1]
  const data     = match[2]
  const imagePart = { inlineData: { mimeType, data } }

  // Step 1: describe
  const describeResult = await model.generateContent([DESCRIBE_PROMPT, imagePart])
  const description = describeResult.response.text()

  // Step 2: convert to JSON, with the description as context
  const convertPrompt = `${EXTRACT_TEMPLATE_PROMPT}

────────────────────────────────────────────
DESCRIÇÃO DETALHADA QUE VOCÊ MESMO FEZ (use como base):
────────────────────────────────────────────
${description}
────────────────────────────────────────────

Agora converta essa descrição em um JSON exato seguindo o schema acima. Retorne APENAS o JSON.`

  const result = await model.generateContent([convertPrompt, imagePart])
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('IA retornou resposta inválida — sem JSON.')

  const parsed = parseStructure(jsonMatch[0])
  if (!parsed) {
    throw new Error('IA retornou estrutura inválida (parseStructure falhou). Tente outra imagem.')
  }

  const errors = validateStructure(parsed)
  if (errors.length > 0) {
    throw new Error('Estrutura gerada com erros: ' + errors.map(e => e.message).join('; '))
  }

  return parsed
}
