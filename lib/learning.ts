/**
 * Learning loop — Sprint 1 helpers.
 *
 * Pure utilities used by the editor (compute diffs, decide if an edit
 * is "significant enough" to record) and by the API endpoint that
 * persists CreativeEdit / ImageGeneration rows.
 *
 * Sprint 2+ will read these rows to personalize the prompt.
 */

/** Character-level Levenshtein distance (small inputs, ad copy). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  // Two-row DP to keep memory O(min(a,b))
  const [s, t] = a.length < b.length ? [a, b] : [b, a]
  const m = s.length, n = t.length
  let prev = new Array(m + 1).fill(0).map((_, i) => i)
  let curr = new Array(m + 1).fill(0)
  for (let j = 1; j <= n; j++) {
    curr[0] = j
    for (let i = 1; i <= m; i++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[i] = Math.min(
        curr[i - 1] + 1,
        prev[i] + 1,
        prev[i - 1] + cost,
      )
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[m]
}

/**
 * Normalized diff between two strings: 0 = identical, 1 = completely
 * different. NaN when both are empty (no diff to compute).
 */
export function diffPct(a: string | null | undefined, b: string | null | undefined): number | null {
  const sa = (a ?? '').trim()
  const sb = (b ?? '').trim()
  if (!sa && !sb) return null
  const denom = Math.max(sa.length, sb.length, 1)
  return Math.min(1, levenshtein(sa, sb) / denom)
}

/**
 * True when ANY of the fields changed by more than `threshold` (default
 * 15% of the longer string). Filters out typo-level edits so the learning
 * dataset isn't polluted with noise.
 */
export function isSignificantEdit(
  ai: { headline?: string | null; subtitle?: string | null; cta?: string | null; imagePrompt?: string | null },
  user: { headline?: string | null; subtitle?: string | null; cta?: string | null; imagePrompt?: string | null },
  threshold = 0.15,
): boolean {
  const fields: Array<keyof typeof ai> = ['headline', 'subtitle', 'cta', 'imagePrompt']
  for (const f of fields) {
    const d = diffPct(ai[f], user[f])
    if (d !== null && d >= threshold) return true
  }
  return false
}

/** Shape sent to the /api/learning/edit endpoint. */
export interface EditCapturePayload {
  carouselId?: string | null
  slideId?:    string | null
  mode:        'creative' | 'carousel'
  topic:       string
  niche?:      string | null
  ai: {
    headline?:    string | null
    subtitle?:    string | null
    cta?:         string | null
    imagePrompt?: string | null
  }
  user: {
    headline?:    string | null
    subtitle?:    string | null
    cta?:         string | null
    imagePrompt?: string | null
  }
}

/** Shape sent to the /api/learning/image endpoint. */
export interface ImageGenCapturePayload {
  slideId?:    string | null
  promptText:  string
  approved?:   boolean
  niche?:      string | null
  regenCount?: number
}

/* ─── Sprint 2: read-side helpers ─────────────────────────────────── */

/** A trimmed CreativeEdit row formatted as a few-shot prompt block. */
export interface StyleExample {
  aiHeadline:      string
  userHeadline:    string
  aiSubtitle:      string | null
  userSubtitle:    string | null
  aiCta:           string | null
  userCta:         string | null
}

/**
 * Picks the most recent SIGNIFICANT edits for a user/mode, ready to
 * splice into a Gemini system prompt as few-shot demonstrations.
 *
 * "Significant" = headline OR subtitle diff >= 30%. Trivial typo edits
 * are filtered out at the diffPct level — they'd add noise.
 *
 * Returns at most `limit` rows. If fewer than `MIN_FOR_FEWSHOT` rows
 * exist, returns [] — the caller should NOT inject anything (avoids
 * polluting the prompt with too-thin signal).
 */
export const MIN_FOR_FEWSHOT = 3

export async function getUserStyleExamples(
  prisma: { creativeEdit: { findMany: (args: any) => Promise<any[]> } },
  userId: string,
  mode: 'creative' | 'carousel',
  limit = 5,
): Promise<StyleExample[]> {
  const rows = await prisma.creativeEdit.findMany({
    where: {
      userId,
      mode,
      OR: [
        { headlineDiffPct: { gte: 0.3 } },
        { subtitleDiffPct: { gte: 0.3 } },
      ],
      // Must have at least one before/after pair populated
      NOT: { aiHeadline: null, userHeadline: null },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      aiHeadline: true, userHeadline: true,
      aiSubtitle: true, userSubtitle: true,
      aiCta:      true, userCta:      true,
    },
  })

  if (rows.length < MIN_FOR_FEWSHOT) return []

  return rows
    .filter(r => r.aiHeadline && r.userHeadline)
    .map(r => ({
      aiHeadline:   r.aiHeadline!,
      userHeadline: r.userHeadline!,
      aiSubtitle:   r.aiSubtitle ?? null,
      userSubtitle: r.userSubtitle ?? null,
      aiCta:        r.aiCta ?? null,
      userCta:      r.userCta ?? null,
    }))
}

/**
 * Formats StyleExample[] into a prompt block ready to append to the
 * Gemini system prompt. Kept short (~200 tokens for 5 examples) to
 * stay under context budget.
 */
export function renderStyleBlock(examples: StyleExample[]): string {
  if (examples.length === 0) return ''
  const lines = [
    '',
    '— ESTILO PESSOAL DO USUÁRIO —',
    'Este usuário costuma transformar copy gerada da seguinte forma.',
    'Aplique o MESMO padrão de transformação ao gerar o criativo abaixo.',
    '',
  ]
  examples.forEach((ex, i) => {
    lines.push(`Exemplo ${i + 1}:`)
    lines.push(`  HEADLINE da IA:    "${ex.aiHeadline}"`)
    lines.push(`  HEADLINE do user:  "${ex.userHeadline}"`)
    if (ex.aiSubtitle && ex.userSubtitle && ex.aiSubtitle !== ex.userSubtitle) {
      lines.push(`  SUBTITLE da IA:    "${ex.aiSubtitle}"`)
      lines.push(`  SUBTITLE do user:  "${ex.userSubtitle}"`)
    }
    if (ex.aiCta && ex.userCta && ex.aiCta !== ex.userCta) {
      lines.push(`  CTA da IA:    "${ex.aiCta}"`)
      lines.push(`  CTA do user:  "${ex.userCta}"`)
    }
    lines.push('')
  })
  lines.push('Continue gerando NOVOS criativos, mas adotando o estilo,')
  lines.push('tom e estrutura típicos das versões "do user" acima.')
  lines.push('')
  return lines.join('\n')
}
