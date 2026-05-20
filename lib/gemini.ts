import { GoogleGenerativeAI } from '@google/generative-ai'
import { Slide, SlideLayout, CarouselStyle, createSlide } from './store'
import { extractJsonFromAi } from './extract-json'

export interface GenerateCarouselOptions {
  topic: string
  slideCount: number
  style: CarouselStyle
  tone: 'educativo' | 'motivacional' | 'viral' | 'profissional' | 'humoristico'
  targetAudience: string
}

export interface GenerateAdCreativeOptions {
  topic: string
  style: CarouselStyle
  tone: 'educativo' | 'motivacional' | 'viral' | 'profissional' | 'humoristico'
  targetAudience: string
}

export interface GeneratedSlideContent {
  title: string
  content: string
  imagePrompt: string
  cta?: string     // Each slide is its own ad in "Criativos em Massa" → needs its own CTA.
  subtitle?: string
  hook?: string
}

export interface GeneratedAdCreative {
  headline: string
  subtitle: string
  cta: string
  imagePrompt: string
}

export const MISSING_GEMINI_KEY_MESSAGE =
  'A chave de IA do sistema precisa ser atualizada pelo administrador.'

/**
 * Resolve the server-managed Gemini API key.
 * The key is read ONLY from process.env.GEMINI_API_KEY — never from the
 * client. Throws a sanitized error if absent.
 */
export function getServerGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key || !key.trim()) {
    throw new GeminiKeyMissingError()
  }
  return key
}

export class GeminiKeyMissingError extends Error {
  readonly publicMessage = MISSING_GEMINI_KEY_MESSAGE
  constructor() {
    super('GEMINI_API_KEY is not configured on the server')
    this.name = 'GeminiKeyMissingError'
  }
}

const CAROUSEL_PROMPT = (opts: GenerateCarouselOptions) => `
Você é um especialista em criação de conteúdo viral para redes sociais.

Crie um carrossel de ${opts.slideCount} slides sobre o tema: "${opts.topic}"

Público-alvo: ${opts.targetAudience}
Tom: ${opts.tone}

REGRAS:
1. O PRIMEIRO slide deve ter um gancho (hook) PODEROSO que pare o scroll
2. Cada slide deve ter NO MÁXIMO 2-3 linhas de texto
3. Use números, emojis estratégicos e palavras de impacto
4. O ÚLTIMO slide deve ter um CTA (Call to Action) claro
5. O conteúdo deve ser em PORTUGUÊS BRASILEIRO
6. Seja direto, impactante e viral

Retorne APENAS um JSON válido neste formato, sem nenhum texto antes ou depois:
{
  "title": "Título do carrossel",
  "slides": [
    {
      "title": "Título curto e impactante",
      "content": "Conteúdo do slide (máx 3 linhas)",
      "imagePrompt": "Descrição em inglês para gerar imagem de fundo (fotorrealista, 4k, vibrante, sem texto)",
      "hook": "Apenas para o slide 1: o gancho principal"
    }
  ]
}
`

export async function generateCarouselContent(
  opts: GenerateCarouselOptions
): Promise<{ title: string; slides: GeneratedSlideContent[] }> {
  const genAI = new GoogleGenerativeAI(getServerGeminiKey())
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const result = await model.generateContent(CAROUSEL_PROMPT(opts))
  const text = result.response.text()
  return extractJsonFromAi(text)
}

export async function generateSlideImage(prompt: string): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(getServerGeminiKey())
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })

    const enhancedPrompt = `${prompt}, cinematic lighting, ultra detailed, 4k, vibrant colors, modern aesthetic, no text, no watermark, photorealistic`

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: enhancedPrompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      } as any,
    })

    const response = result.response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData?.mimeType?.startsWith('image/')) {
        const inlineData = (part as any).inlineData
        return `data:${inlineData.mimeType};base64,${inlineData.data}`
      }
    }
    return null
  } catch (error) {
    if (error instanceof GeminiKeyMissingError) throw error
    console.error('Error generating image')
    return null
  }
}

export function contentToSlides(
  generatedSlides: GeneratedSlideContent[],
  style: CarouselStyle
): Slide[] {
  return generatedSlides.map((s) =>
    createSlide({
      title:       s.title,
      content:     s.content,
      subtitle:    s.subtitle ?? s.content,
      cta:         s.cta,                       // Each slide is an independent ad — needs its own CTA.
      imagePrompt: s.imagePrompt,
      backgroundColor: style.backgroundColor,
      textColor:       style.textColor,
      accentColor:     style.primaryColor,
      fontFamily:      style.fontFamily,
      layout:          'centered',
    })
  )
}

const AD_CREATIVE_PROMPT = (opts: GenerateAdCreativeOptions) => `
Você é um copywriter especialista em criativos de anúncios virais para Instagram, Facebook Ads e Google Ads.

Crie a copy de UM criativo de anúncio sobre: "${opts.topic}"

Público-alvo: ${opts.targetAudience}
Tom: ${opts.tone}

REGRAS:
1. HEADLINE: máximo 6 palavras, IMPACTANTE, para parar o scroll. Use números, palavras de poder, contraste ou curiosidade.
2. SUBTITLE: máximo 12 palavras, complementa a headline e gera desejo/dor.
3. CTA: máximo 4 palavras, ação direta no imperativo (ex: "Quero saber mais", "Comece agora", "Garanta o seu").
4. IMAGE PROMPT: descrição em INGLÊS de uma imagem de fundo fotorrealista, sem texto, sem logos, sem marca d'água. Deve ser visualmente forte, com espaço para texto sobreposto, iluminação cinematográfica, 4k. Pense numa imagem que reforce o sentimento da headline.
5. Conteúdo em PORTUGUÊS BRASILEIRO, exceto o image prompt.

Retorne APENAS JSON válido, sem texto antes ou depois:
{
  "headline": "Headline forte e curta",
  "subtitle": "Subtítulo complementar",
  "cta": "Texto do botão CTA",
  "imagePrompt": "English description of the background image..."
}
`

export async function generateAdCreativeContent(
  opts: GenerateAdCreativeOptions
): Promise<GeneratedAdCreative> {
  const genAI = new GoogleGenerativeAI(getServerGeminiKey())
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const result = await model.generateContent(AD_CREATIVE_PROMPT(opts))
  const text = result.response.text()
  return extractJsonFromAi(text)
}

export function adCreativeToSlide(
  creative: GeneratedAdCreative,
  style: CarouselStyle,
  layout: SlideLayout = 'headline-banner'
): Slide {
  return createSlide({
    title: creative.headline,
    subtitle: creative.subtitle,
    content: creative.subtitle,
    cta: creative.cta,
    imagePrompt: creative.imagePrompt,
    backgroundColor: style.backgroundColor,
    textColor: style.textColor,
    accentColor: style.primaryColor,
    fontFamily: style.fontFamily,
    layout,
  })
}
