/**
 * Server-side only — fetches active prompts from DB and fills template variables.
 * Gracefully falls back to hardcoded defaults if DB is unavailable.
 */
import { prisma } from './db'

export type PromptType =
  | 'creative_copy'
  | 'carousel_copy'
  | 'creative_image'
  | 'carousel_image'

/* ─── Hardcoded fallbacks ──────────────────────────────── */
const FALLBACKS: Record<PromptType, string> = {
  creative_copy: `Você é um copywriter especialista em marketing digital.

Crie um criativo de anúncio VIRAL sobre: {{topic}}
Tom: {{tone}} | Público: {{audience}}

Retorne APENAS JSON:
{"headline":"...","subtitle":"...","cta":"...","imagePrompt":"..."}`,

  carousel_copy: `Você é especialista em carrosséis virais.

Tema: {{topic}} | Tom: {{tone}} | Público: {{audience}} | Slides: {{slideCount}}

Retorne APENAS JSON:
{"title":"...","slides":[{"title":"...","content":"...","imagePrompt":"..."}]}`,

  creative_image: `{{imagePrompt}}, cinematic lighting, 4k, photorealistic, no text`,

  carousel_image: `{{imagePrompt}}, professional photography, clean composition, 4k, no text`,
}

/* ─── Public API ───────────────────────────────────────── */

/** Returns the active prompt template for the given type, or falls back to default. */
export async function getActivePrompt(type: PromptType): Promise<string> {
  try {
    const config = await prisma.promptConfig.findFirst({
      where: { type, active: true },
      orderBy: { version: 'desc' },
    })
    return config?.content ?? FALLBACKS[type]
  } catch {
    return FALLBACKS[type]
  }
}

/** Replaces {{variable}} placeholders with provided values. */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key]
    return val !== undefined ? String(val) : `{{${key}}}`
  })
}

/** One-shot helper: fetch + fill in one call. */
export async function buildPrompt(
  type: PromptType,
  vars: Record<string, string | number>
): Promise<string> {
  const template = await getActivePrompt(type)
  return fillTemplate(template, vars)
}
