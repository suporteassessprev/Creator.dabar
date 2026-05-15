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
Você é um analisador especialista em design de templates de redes sociais e anúncios virais. Analise a imagem fornecida e retorne um JSON puro descrevendo a estrutura visual em formato editável.

REGRAS GERAIS:
- TODAS posições e tamanhos em PORCENTAGEM do canvas (0-100), nunca pixels.
- Identifique o formato do canvas: "1:1" (quadrado), "4:5" (feed vertical), ou "9:16" (story).
- Cores em hex (#RRGGBB) ou rgba(r,g,b,a) quando houver transparência.
- Use *asteriscos* para destacar palavras em cor diferente dentro de um headline (ex: "GERE *IMAGENS* VIRAIS" — IMAGENS terá cor accent).
- Identifique TODOS os elementos visíveis. Não omita nada.
- Use o tipo CORRETO pra cada elemento.

TIPOS DE ELEMENTO DISPONÍVEIS:
1. background — fundo do canvas. Cor sólida ou CSS gradient (linear-gradient, radial-gradient).
2. text_headline — texto grande/título principal. Suporta *asterisk highlight*.
3. text_subtitle — texto médio (body, descrição, subtítulo).
4. text_cta — botão pílula com fundo, padding, raio (geralmente "SAIBA MAIS", "Clique aqui").
5. badge — pílula pequena estilo etiqueta (geralmente decorativo, "NOVO", "+R$ X").
6. account_badge — avatar circular + @handle (Instagram-style). Use quando vir esse padrão.
7. image_static — imagem fixa do design (foto, mockup, logo). Use src: "PLACEHOLDER" — o admin vai substituir.
8. image_slot — placeholder pra imagem que será gerada por IA depois. Use APENAS se a imagem parece um lugar pra fundo genérico que muda por tema (não pra logos/mockups específicos).
9. icon — ícone vetorial. iconName DEVE ser um dos: ${ICON_NAMES.join(', ')}.
10. shape — retângulo (shape: "rectangle") ou círculo (shape: "circle") decorativo.

CAMPOS POR TIPO:
- BaseElement (todos): { id, type, x, y, width, height, zIndex, visible? }
- text_*: { placeholder, fontFamily, fontSize, fontWeight, color, accentColor?, align, lineHeight, background?, borderRadius?, paddingX?, paddingY? }
- account_badge: { handle, fontFamily, fontSize, fontWeight, color, avatarSize }
- image_static: { src: "PLACEHOLDER", objectFit, borderRadius, alt }
- image_slot: { description, objectFit, borderRadius, overlay? }
- icon: { iconName, color, strokeWidth?, background?, borderRadius?, paddingX?, paddingY? }
- shape: { shape: "rectangle"|"circle", fill, borderRadius?, borderColor?, borderWidth?, opacity? }
- background: { fill }

FONTES SUGERIDAS (escolha a que mais combina visualmente):
- Display impacto: Bebas Neue, Anton, Oswald, Archivo Black
- Sans modernas: Inter, Poppins, Montserrat, Work Sans
- Serif: Playfair Display, DM Serif Display, Merriweather

PESO DA FONTE:
- 400 (regular), 600 (semibold), 700 (bold), 900 (black/extrabold)

EXEMPLO DE SAÍDA:
{
  "version": 1,
  "canvas": { "format": "1:1", "backgroundColor": "#0f172a" },
  "elements": [
    { "id": "bg", "type": "background", "x": 0, "y": 0, "width": 100, "height": 100, "zIndex": 0, "fill": "#0f172a" },
    { "id": "acc", "type": "account_badge", "x": 5, "y": 5, "width": 35, "height": 5, "zIndex": 5, "handle": "@meu_perfil", "fontFamily": "Inter", "fontSize": 24, "fontWeight": 600, "color": "#ffffff", "avatarSize": 40 },
    { "id": "hl", "type": "text_headline", "x": 5, "y": 18, "width": 90, "height": 25, "zIndex": 10, "placeholder": "O *CUSTO OCULTO* DA IA", "fontFamily": "Anton", "fontSize": 88, "fontWeight": 900, "color": "#ffffff", "accentColor": "#facc15", "align": "left", "lineHeight": 1.05 }
  ]
}

INSTRUÇÕES FINAIS:
- Retorne APENAS o JSON. SEM markdown, sem comentários, sem texto antes/depois.
- IDs únicos e descritivos ("bg", "acc1", "hl1", "subt1", "cta1").
- zIndex crescente do fundo pra frente (background=0, decorações=1-5, textos=10+).
- Posições aproximadas — não precisa ser pixel-perfect. O admin vai refinar.
`.trim()

export interface ExtractionResult {
  structure: TemplateStructure
  notes?: string
}

/**
 * Call Gemini Vision with the prompt + image and parse the response.
 * Returns a validated TemplateStructure or throws with a user-readable error.
 */
export async function extractTemplateFromImage(
  imageDataUrl: string,
  geminiApiKey: string
): Promise<TemplateStructure> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  // Convert data URL to base64 + mime
  const match = imageDataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/)
  if (!match) throw new Error('Imagem inválida (esperado data URL)')
  const mimeType = match[1]
  const data     = match[2]

  const result = await model.generateContent([
    EXTRACT_TEMPLATE_PROMPT,
    { inlineData: { mimeType, data } },
  ])

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
