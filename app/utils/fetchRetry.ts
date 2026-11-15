export interface RetryOptions {
  /** Per-attempt timeout; the default gives up after ~8 s with one retry. */
  timeoutMs?: number
  /** Extra attempts after the first. */
  retries?: number
}

function statusOf(error: unknown): number | undefined {
  const candidate = error as {
    statusCode?: number
    status?: number
    response?: { status?: number }
  }
  return candidate.statusCode ?? candidate.status ?? candidate.response?.status
}

/**
 * Runs `run` with a timeout and a small retry budget. 4xx responses are final
 * (retrying a 404 only delays the fallback); timeouts and 5xx are retried.
 */
export async function retryFetch<T>(
  run: (signal: AbortSignal) => Promise<T>,
  { timeoutMs = 4000, retries = 1 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await run(controller.signal)
    }
    catch (error) {
      lastError = error
      const status = statusOf(error)
      if (status !== undefined && status < 500) break
    }
    finally {
      clearTimeout(timer)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Falha de rede')
}

/** `$fetch` with the retry/timeout policy used by the public pages. */
export function fetchWithRetry<T>(
  url: string,
  options: Record<string, unknown> = {},
  config: RetryOptions = {},
): Promise<T> {
  return retryFetch(async signal => (await $fetch<T>(url, { ...options, signal })) as T, config)
}
