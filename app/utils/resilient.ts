/**
 * `$fetch` com prazo e uma repetição.
 *
 * Regras (issue #82):
 * - prazo por omissão de 8 s: uma resposta lenta (5 s) continua a chegar, mas
 *   nada fica pendurado para sempre;
 * - repete uma vez falhas de rede e 5xx;
 * - não repete 404 (o recurso não existe) nem o prazo esgotado (já esperámos 8 s).
 */

type FetchLike = <T>(url: string, options?: Record<string, unknown>) => Promise<T>

export interface ReliableOptions {
  timeoutMs?: number
  retries?: number
}

export class ReliableFetchError extends Error {
  readonly statusCode: number
  readonly timeout: boolean

  constructor(message: string, statusCode: number, timeout = false) {
    super(message)
    this.name = 'ReliableFetchError'
    this.statusCode = statusCode
    this.timeout = timeout
  }
}

function statusOf(error: unknown): number {
  const err = error as {
    statusCode?: number
    status?: number
    response?: { status?: number }
    cause?: { statusCode?: number }
  } | null
  return err?.statusCode ?? err?.status ?? err?.response?.status ?? err?.cause?.statusCode ?? 0
}

function isAbort(error: unknown): boolean {
  const err = error as { name?: string } | null
  return err?.name === 'AbortError'
}

export async function fetchReliable<T>(
  fetcher: FetchLike,
  url: string,
  options: Record<string, unknown> = {},
  { timeoutMs = 8000, retries = 1 }: ReliableOptions = {},
): Promise<T> {
  let attempt = 0

  for (;;) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetcher<T>(url, { ...options, signal: controller.signal })
    }
    catch (error) {
      const status = statusOf(error)
      const timeout = isAbort(error)
      const retryable = !timeout && (status === 0 || status >= 500) && attempt < retries
      if (retryable) {
        attempt += 1
        continue
      }
      if (timeout) throw new ReliableFetchError('Tempo esgotado', 408, true)
      throw new ReliableFetchError('Falha ao contactar o arquivo', status || 503)
    }
    finally {
      clearTimeout(timer)
    }
  }
}
