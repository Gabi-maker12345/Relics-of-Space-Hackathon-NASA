import { describe, expect, it, vi } from 'vitest'
import { fetchReliable, ReliableFetchError } from '../app/utils/resilient'
import { panelFromSeed } from '../app/utils/seedFallback'

interface FetcherOptions {
  signal?: AbortSignal
}

describe('fetchReliable', () => {
  it('repete uma vez um 500 e desiste', async () => {
    const fetcher = vi.fn(async () => {
      throw Object.assign(new Error('server'), { statusCode: 500 })
    })

    await expect(fetchReliable(fetcher, '/api/x')).rejects.toMatchObject({ statusCode: 500 })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('não repete um 404', async () => {
    const fetcher = vi.fn(async () => {
      throw Object.assign(new Error('missing'), { statusCode: 404 })
    })

    await expect(fetchReliable(fetcher, '/api/x')).rejects.toMatchObject({ statusCode: 404 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('repete falhas de rede (status 0)', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('offline')
    })

    await expect(fetchReliable(fetcher, '/api/x')).rejects.toBeInstanceOf(ReliableFetchError)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('aborta ao fim do prazo e não repete', async () => {
    vi.useFakeTimers()
    try {
      const pending = Promise.withResolvers<never>()
      const fetcher = vi.fn((_url: string, options: FetcherOptions = {}) => {
        options.signal?.addEventListener('abort', () => {
          pending.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
        return pending.promise
      })

      const call = fetchReliable(fetcher as never, '/api/x', {}, { timeoutMs: 8000 })
      const assertion = expect(call).rejects.toMatchObject({ timeout: true, statusCode: 408 })
      await vi.advanceTimersByTimeAsync(8000)
      await assertion
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('deixa passar uma resposta lenta (5 s) mas dentro do prazo', async () => {
    vi.useFakeTimers()
    try {
      const slow = Promise.withResolvers<Array<{ id: string }>>()
      const fetcher = vi.fn(() => slow.promise)

      const call = fetchReliable(fetcher, '/api/x', {}, { timeoutMs: 8000 })
      // 5 s de rede: o prazo de 8 s não corta
      await vi.advanceTimersByTimeAsync(5000)
      slow.resolve([{ id: 'ingenuity' }])

      await expect(call).resolves.toEqual([{ id: 'ingenuity' }])
      expect(fetcher).toHaveBeenCalledTimes(1)
    }
    finally {
      vi.useRealTimers()
    }
  })
})

describe('panelFromSeed', () => {
  it('devolve as 12 relíquias publicadas quando a API falha', () => {
    const items = panelFromSeed()
    expect(items).toHaveLength(12)
    expect(items[0]?.image.startsWith('/images/')).toBe(true)
    expect(items[0]?.cover).toBeNull()
  })

  it('aplica os filtros do servidor (local, estado, nome)', () => {
    expect(panelFromSeed({ location: 'mars' })).toHaveLength(5)
    expect(panelFromSeed({ location: 'deep_space' })).toHaveLength(4)
    expect(panelFromSeed({ q: 'voy' }).map(item => item.name)).toEqual(['Voyager 1', 'Voyager 2'])
    expect(panelFromSeed({ q: 'NADA' })).toHaveLength(0)
  })
})
