import { type H3Event, getRequestIP } from 'h3'

type Bucket = {
  count: number
  resetAt: number
}

interface RateLimitError extends Error {
  statusCode?: number
  statusMessage?: string
  headers?: Record<string, string>
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_ATTEMPTS = 5

function getKey(event: H3Event, email?: string) {
  try {
    const req = event.node?.req as { socket?: { remoteAddress?: string } } | undefined
    const ip = getRequestIP(event, { xForwardedFor: true }) || req?.socket?.remoteAddress || 'unknown'
    const mail = email?.trim().toLowerCase()
    return mail ? `login:${ip}:${mail}` : `login:${ip}`
  }
  catch {
    const mail = email?.trim().toLowerCase()
    return mail ? `login:test:${mail}` : 'login:test'
  }
}

export function checkLoginRateLimit(event: H3Event, email?: string) {
  const key = getKey(event, email)
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    const error: RateLimitError = new Error('Too many login attempts')
    error.statusCode = 429
    error.statusMessage = 'Too Many Requests'
    error.message = 'Demasiadas tentativas de login. Tenta novamente mais tarde.'
    error.headers = { 'Retry-After': String(retryAfter) }
    throw error
  }

  bucket.count += 1
}

export function resetLoginRateLimit(event: H3Event, email?: string) {
  const key = getKey(event, email)
  buckets.delete(key)
}
export function clearLoginRateLimit() {
  buckets.clear()
}
