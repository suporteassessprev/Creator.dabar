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
