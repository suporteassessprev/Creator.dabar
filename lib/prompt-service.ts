/**
 * Server-side only — fetches active prompts from DB and fills template variables.
 * Gracefully falls back to hardcoded defaults if DB is unavailable.
 */
import { prisma } from './db'
import { getUserStyleExamples, renderStyleBlock } from './learning'

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

/**
 * Required placeholders per prompt type. If the admin saved a prompt
 * that's missing one of these (easy to do accidentally — the editor
 * doesn't enforce it), we'd send Gemini instructions without the user
 * input and get back "Estou pronto, me forneça o comando" or similar.
 *
 * Build with these as a safety net: if any required var is set but
 * its placeholder isn't in the template, append a structured INPUT
 * block at the end so the model always sees the user's data.
 */
const REQUIRED_PLACEHOLDERS: Record<PromptType, string[]> = {
  creative_copy:   ['topic'],
  carousel_copy:   ['topic'],
  creative_image:  ['imagePrompt'],
  carousel_image:  ['imagePrompt'],
}

/**
 * Optional context that's only relevant for text-generation prompts.
 * When `userId` is supplied, buildPrompt will look up the user's past
 * edits and inject them as few-shot examples (Sprint 2 — Learning Loop).
 */
export interface BuildPromptContext {
  userId?: string
}

/** One-shot helper: fetch + fill in one call. */
export async function buildPrompt(
  type: PromptType,
  vars: Record<string, string | number>,
  ctx?: BuildPromptContext,
): Promise<string> {
  const template = await getActivePrompt(type)
  const filled = fillTemplate(template, vars)

  // Sprint 2: for TEXT-generation prompts, lookup the user's past
  // edits and append them as few-shot demonstrations. Safe no-op when:
  //  - ctx.userId not provided (e.g. admin "Testar prompt")
  //  - user has < MIN_FOR_FEWSHOT (3) significant edits yet
  //  - DB lookup fails
  let styleBlock = ''
  if (ctx?.userId && (type === 'creative_copy' || type === 'carousel_copy')) {
    try {
      const mode = type === 'creative_copy' ? 'creative' : 'carousel'
      const examples = await getUserStyleExamples(prisma, ctx.userId, mode, 5)
      styleBlock = renderStyleBlock(examples)
    } catch (e: any) {
      console.error('[learning] failed to load style examples:', e?.message ?? e)
    }
  }

  const required = REQUIRED_PLACEHOLDERS[type] ?? []
  const missing = required.filter(key => {
    const hasPlaceholder = template.includes(`{{${key}}}`)
    const valProvided    = vars[key] !== undefined && String(vars[key]).trim() !== ''
    return valProvided && !hasPlaceholder
  })

  const base = missing.length === 0
    ? filled
    : (() => {
        const inputBlock = missing
          .map(key => `${key.toUpperCase()}: ${vars[key]}`)
          .concat(
            Object.entries(vars)
              .filter(([k, v]) => !missing.includes(k) && !template.includes(`{{${k}}}`) && String(v ?? '').trim() !== '')
              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
          )
          .join('\n')
        return `${filled}\n\n[INPUT DO USUÁRIO]\n${inputBlock}\n\nRetorne APENAS o JSON pedido, sem texto adicional.`
      })()

  // Splice the style block right before the JSON instruction so the
  // model sees personalized examples LAST (recency primacy works in
  // our favor here).
  return styleBlock ? `${base}${styleBlock}` : base
}
