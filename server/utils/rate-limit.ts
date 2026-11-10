/**
 * Small in-memory rate limiter for the login endpoint.
 *
 * The backend runs on Vercel as a serverless function, so the map lives per
 * instance: it is not a global quota, but it still shuts down brute force from
 * a single client hitting the same instance. For a shared quota, move the
 * counters to Postgres or Upstash — tracked for a later milestone.
 */

type Bucket = {
  count: number
  resetAt: number
}

export interface RateLimitOptions {
  /** Maximum number of attempts inside the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  /** Seconds until the window resets; 0 when allowed. */
  retryAfterSeconds: number
}

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * Registers an attempt for `key` and reports whether it is still allowed.
 * Expired buckets are recycled, so a blocked client recovers automatically.
 */
export function consume(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) prune(now)
    bucket = { count: 0, resetAt: now + options.windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  const allowed = bucket.count <= options.limit

  return {
    allowed,
    remaining: Math.max(0, options.limit - bucket.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  }
}

/**
 * Clears one key, or every key when called without arguments.
 * Successful logins and tests use this to avoid carrying state around.
 */
export function resetRateLimit(key?: string): void {
  if (key === undefined) buckets.clear()
  else buckets.delete(key)
}

/** Test helper: current number of tracked keys. */
export function rateLimitSize(): number {
  return buckets.size
}
