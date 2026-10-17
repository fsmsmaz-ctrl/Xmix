/**
 * Lightweight in-memory rate limiter for abuse-prone endpoints
 * (login brute-force, public form spam). Keyed by IP (+ optional scope).
 *
 * Note: in serverless deployments the bucket is per-instance/per-region;
 * it still raises the bar substantially and needs zero infrastructure.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Periodically purge expired buckets so the map never grows unbounded
const SWEEP_INTERVAL = 10 * 60 * 1000
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Returns null when allowed, or a `retryAfter` (seconds) when the limit is hit.
 * @param key     unique bucket key, e.g. `login:1.2.3.4` or `contact:1.2.3.4`
 * @param limit   max requests per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): { retryAfter: number } | null {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }
  bucket.count += 1
  if (bucket.count > limit) {
    return { retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return null
}
