/**
 * Robust JSON extraction for Gemini responses.
 *
 * Gemini doesn't always honor "return only JSON" — it sometimes wraps
 * output in ```json fences, prefixes prose, or returns plain text. This
 * tries several strategies before giving up:
 *
 *  1. Strip ```json ... ``` fences
 *  2. Match the first balanced {...} block (handles nested braces)
 *  3. Try parsing whatever's left
 *
 * On failure, throws an Error whose message includes a short snippet
 * of the offending text — useful so the user can paste it back to me
 * for diagnosis without exposing secrets (Gemini text doesn't include
 * the API key).
 */
export class InvalidAiResponseError extends Error {
  readonly snippet: string
  constructor(message: string, snippet: string) {
    super(message)
    this.name = 'InvalidAiResponseError'
    this.snippet = snippet
  }
}

export function extractJsonFromAi<T = unknown>(text: string): T {
  const raw = text ?? ''
  const trimmed = raw.trim()

  if (!trimmed) {
    throw new InvalidAiResponseError(
      'IA retornou resposta vazia. Tente novamente em alguns segundos.',
      ''
    )
  }

  // Strategy 1: explicit code fence ```json ... ```
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    const parsed = tryParse<T>(fenced[1])
    if (parsed !== undefined) return parsed
  }

  // Strategy 2: balanced braces — walk from first { tracking depth
  const firstBrace = trimmed.indexOf('{')
  if (firstBrace !== -1) {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = firstBrace; i < trimmed.length; i++) {
      const c = trimmed[i]
      if (escape) { escape = false; continue }
      if (c === '\\' && inString) { escape = true; continue }
      if (c === '"') inString = !inString
      if (inString) continue
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          const candidate = trimmed.slice(firstBrace, i + 1)
          const parsed = tryParse<T>(candidate)
          if (parsed !== undefined) return parsed
          break
        }
      }
    }
  }

  // Strategy 3: try the whole thing as-is
  const direct = tryParse<T>(trimmed)
  if (direct !== undefined) return direct

  // Give up — show a snippet so the user can report back
  const snippet = trimmed.slice(0, 180).replace(/\s+/g, ' ')
  throw new InvalidAiResponseError(
    `IA retornou texto sem JSON. Início da resposta: "${snippet}${trimmed.length > 180 ? '…' : ''}"`,
    snippet
  )
}

function tryParse<T>(s: string): T | undefined {
  try {
    return JSON.parse(s) as T
  } catch {
    return undefined
  }
}
