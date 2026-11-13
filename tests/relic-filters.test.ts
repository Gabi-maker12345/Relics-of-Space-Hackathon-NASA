import { describe, expect, it } from 'vitest'
import {
  hasActiveRelicFilters,
  parseRelicFilters,
  toRelicQuery,
} from '../app/utils/relicFilters'

describe('parseRelicFilters', () => {
  it('keeps known location/status and trims the query', () => {
    expect(parseRelicFilters({ location: 'mars', status: 'silent', q: '  opp ' })).toEqual({
      location: 'mars',
      status: 'silent',
      q: 'opp',
    })
  })

  it('takes the first value when the query repeats a key', () => {
    expect(parseRelicFilters({ location: ['moon', 'mars'], q: ['viking', 'apollo'] })).toEqual({
      location: 'moon',
      status: undefined,
      q: 'viking',
    })
  })

  it('drops unknown values instead of failing', () => {
    expect(parseRelicFilters({ location: 'jupiter', status: 'exploded', q: 'ok' })).toEqual({
      location: undefined,
      status: undefined,
      q: 'ok',
    })
  })

  it('caps the search term and treats blanks as empty', () => {
    const parsed = parseRelicFilters({ q: 'x'.repeat(200) })
    expect(parsed.q).toHaveLength(120)
    expect(parseRelicFilters({ q: '   ' }).q).toBe('')
    expect(parseRelicFilters({}).location).toBeUndefined()
  })
})

describe('toRelicQuery', () => {
  it('serialises only the active filters', () => {
    expect(toRelicQuery({ location: 'mars', status: undefined, q: '' })).toEqual({ location: 'mars' })
    expect(toRelicQuery({ q: '  viking  ' })).toEqual({ q: 'viking' })
    expect(toRelicQuery({ q: '' })).toEqual({})
  })
})

describe('hasActiveRelicFilters', () => {
  it('ignores an empty search term', () => {
    expect(hasActiveRelicFilters({ q: '  ' })).toBe(false)
    expect(hasActiveRelicFilters({ status: 'lost', q: '' })).toBe(true)
    expect(hasActiveRelicFilters({ q: 'spirit' })).toBe(true)
  })
})
