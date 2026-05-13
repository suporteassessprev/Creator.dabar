/**
 * Simple in-memory rate limiter.
 *
 * Designed to be swapped for a Redis/Upstash backend in production without
 * changing call sites. To migrate:
 *   1. Replace the `store` Map with an Upstash Redis client.
 *   2. Use `INCR` + `EXPIRE` or a sliding-window script.
 *   3. The function signature stays the same.
 *
 * Current implementation: fixed window, keyed by (identifier + route prefix).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store — cleared on server restart (acceptable for dev/single-instance)
const store = new Map<string, RateLimitEntry>()

export interface RateLimitResult {
  allowed: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Unix timestamp (ms) when the window resets */
  resetAt: number
}

/**
 * Check and record a rate-limit hit.
 *
 * @param identifier  IP address or user ID
 * @param prefix      Route label used to namespace the key (e.g. 'auth:login')
 * @param limit       Max requests per window (default 10)
 * @param windowMs    Window duration in ms (default 60 000 = 1 min)
 */
export function rateLimit(
  identifier: string,
  prefix: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const key = `${prefix}:${identifier}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    // New window
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  entry.count += 1

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/** Extract a best-effort IP from Next.js request headers */
export function getClientIp(req: Request): string {
  const forwarded = (req as any).headers?.get?.('x-forwarded-for') as string | null
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = (req as any).headers?.get?.('x-real-ip') as string | null
  if (real) return real
  return 'unknown'
}
