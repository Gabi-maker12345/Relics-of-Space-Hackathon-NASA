import { describe, expect, it } from 'vitest'
import type { Relic } from '../shared/types/relic'
import {
  isPublished,
  isVideoUrl,
  LOCATION_LABEL,
  relicLocation,
  relicStatus,
  STATUS_LABEL,
} from '../app/utils/relics'

const relic = {
  id: 'spirit',
  name: 'Spirit',
  mission: 'MER',
  tagline: 'Teste',
  body: 'Teste',
  facts: [],
  image: '/images/relics/spirit-1.jpg',
  alt: 'Spirit',
  ratio: '16 / 9',
  scenes: [],
  steps: [],
  total_steps: 0,
  published: true,
} as Relic

describe('relic UI helpers (consolidation)', () => {
  it('detects video covers by extension, with or without query/hash', () => {
    expect(isVideoUrl('/media/cover.mp4')).toBe(true)
    expect(isVideoUrl('/media/cover.webm?x=1')).toBe(true)
    expect(isVideoUrl('/media/cover.MOV#t=1')).toBe(true)
    expect(isVideoUrl('/images/relics/spirit-1.jpg')).toBe(false)
    expect(isVideoUrl('')).toBe(false)
    expect(isVideoUrl(null)).toBe(false)
  })

  it('labels every status and location', () => {
    expect(STATUS_LABEL).toEqual({ active: 'Activo', silent: 'Silencioso', lost: 'Perdido' })
    expect(LOCATION_LABEL).toEqual({ moon: 'Lua', mars: 'Marte', deep_space: 'Espaço profundo' })
  })

  it('falls back to active/moon and treats only false as unpublished', () => {
    expect(relicStatus(relic)).toBe('active')
    expect(relicLocation(relic)).toBe('moon')
    expect(isPublished(relic)).toBe(true)
    expect(isPublished({ ...relic, published: false })).toBe(false)
  })
})
