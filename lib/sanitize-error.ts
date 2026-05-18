/**
 * Returns a user-visible error message that's safe to put into an API
 * response. Strips anything that looks like a Gemini API key, absolute
 * filesystem path, or JWT, and truncates to a reasonable length.
 *
 * The point is to give the user enough signal to act on (rate limit,
 * safety filter, invalid JSON, etc.) without leaking secrets.
 */
export function sanitizeErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  if (!raw) return fallback

  let msg = raw
    // Gemini keys (AIza...)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[KEY]')
    // Generic long base64-looking tokens
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_.-]{10,}/g, '[TOKEN]')
    // Absolute filesystem paths
    .replace(/\/(?:Users|home|var|opt|root)\/[\w./-]+/g, '[PATH]')

  if (msg.length > 240) msg = msg.slice(0, 240) + '…'
  return msg
}
