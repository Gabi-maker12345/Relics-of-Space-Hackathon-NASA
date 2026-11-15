import { afterEach, describe, expect, it, vi } from 'vitest'
import { retryFetch } from '../app/utils/fetchRetry'

describe('retryFetch (resilience)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns the first successful result', async () => {
    const run = vi.fn(async () => 'ok')
    await expect(retryFetch(run)).resolves.toBe('ok')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('retries a 500 once and succeeds', async () => {
    let calls = 0
    const run = vi.fn(async () => {
      calls += 1
      if (calls === 1) throw Object.assign(new Error('server'), { statusCode: 500 })
      return 'ok'
    })
    await expect(retryFetch(run, { retries: 1 })).resolves.toBe('ok')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('does not retry a 404', async () => {
    const run = vi.fn(async () => {
      throw Object.assign(new Error('not found'), { statusCode: 404 })
    })
    await expect(retryFetch(run, { retries: 2 })).rejects.toThrow('not found')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('throws after exhausting the retries', async () => {
    const run = vi.fn(async () => {
      throw Object.assign(new Error('server'), { statusCode: 500 })
    })
    await expect(retryFetch(run, { retries: 1 })).rejects.toThrow('server')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('aborts an attempt that exceeds the timeout', async () => {
    vi.useFakeTimers()
    const run = vi.fn((signal: AbortSignal) => new Promise<string>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }))

    const assertion = expect(retryFetch(run, { timeoutMs: 100, retries: 0 })).rejects.toThrow('aborted')
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('recovers on the retry after a timeout', async () => {
    vi.useFakeTimers()
    let calls = 0
    const run = vi.fn((signal: AbortSignal) => new Promise<string>((resolve, reject) => {
      calls += 1
      if (calls === 2) {
        resolve('ok')
        return
      }
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }))

    const assertion = expect(retryFetch(run, { timeoutMs: 100, retries: 1 })).resolves.toBe('ok')
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    expect(run).toHaveBeenCalledTimes(2)
  })
})
