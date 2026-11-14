import { describe, expect, it } from 'vitest'
import {
  buildWordTimings,
  splitNarrationWords,
  wordIndexAt,
  wordIndexAtChar,
} from '../app/utils/narration'

describe('splitNarrationWords', () => {
  it('splits on whitespace and drops empties', () => {
    expect(splitNarrationWords('  Pousou em Marte.  ')).toEqual(['Pousou', 'em', 'Marte.'])
    expect(splitNarrationWords('')).toEqual([])
  })
})

describe('buildWordTimings', () => {
  const text = 'Uma maratona de quarenta e cinco quilómetros'

  it('covers the whole duration without gaps', () => {
    const timings = buildWordTimings(text, 12)
    expect(timings).toHaveLength(7)
    expect(timings[0]!.start).toBe(0)
    expect(timings.at(-1)!.end).toBe(12)
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i]!.start).toBeCloseTo(timings[i - 1]!.end, 6)
      expect(timings[i]!.end).toBeGreaterThan(timings[i]!.start)
    }
  })

  it('gives longer words more time', () => {
    const timings = buildWordTimings('a quilómetros', 10)
    const short = timings[0]!.end - timings[0]!.start
    const long = timings[1]!.end - timings[1]!.start
    expect(long).toBeGreaterThan(short)
  })

  it('falls back to zero timings when duration is unknown', () => {
    expect(buildWordTimings('duas palavras', 0).every(word => word.start === 0)).toBe(true)
    expect(buildWordTimings('', 10)).toEqual([])
  })
})

describe('wordIndexAt', () => {
  const timings = buildWordTimings('um dois três quatro', 4)

  it('advances with time', () => {
    expect(wordIndexAt(timings, 0)).toBe(0)
    expect(wordIndexAt(timings, 1.1)).toBe(1)
    expect(wordIndexAt(timings, 3.9)).toBe(3)
    expect(wordIndexAt(timings, 10)).toBe(3)
  })

  it('returns -1 with no words', () => {
    expect(wordIndexAt([], 1)).toBe(-1)
  })
})

describe('wordIndexAtChar', () => {
  const text = 'Pousou em Marte'

  it('maps speech boundaries to word indexes', () => {
    expect(wordIndexAtChar(text, 0)).toBe(0)
    expect(wordIndexAtChar(text, 7)).toBe(1)
    expect(wordIndexAtChar(text, 10)).toBe(2)
    expect(wordIndexAtChar(text, 8)).toBe(1)
  })
})
