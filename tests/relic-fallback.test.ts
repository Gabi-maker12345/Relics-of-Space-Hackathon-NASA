import { describe, expect, it } from 'vitest'
import { relics as seed } from '../app/data/relics'
import { fallbackRelics, toPanelItem } from '../app/utils/relicFallback'

const all = { q: '' }

describe('seed fallback for the public scene (resilience)', () => {
  it('maps every seed relic to a panel item', () => {
    const items = fallbackRelics(seed, all)
    expect(items).toHaveLength(12)
    const spirit = items.find(item => item.id === 'spirit')!
    expect(spirit.name).toBe('Spirit')
    expect(spirit.image).toBe('/images/relics/spirit-1.jpg')
    expect(spirit.cover?.url).toBe('/images/relics/spirit-1.jpg')
    expect(spirit.facts.length).toBeGreaterThan(0)
    expect(spirit.tagline.length).toBeGreaterThan(0)
  })

  it('applies the location and status filters locally', () => {
    const mars = fallbackRelics(seed, { q: '', location: 'mars' })
    expect(mars.length).toBeGreaterThan(0)
    expect(mars.every(item => item.location === 'mars')).toBe(true)

    const lost = fallbackRelics(seed, { q: '', status: 'lost' })
    expect(lost.length).toBeGreaterThan(0)
    expect(lost.every(item => item.status === 'lost')).toBe(true)
  })

  it('searches by name case-insensitively', () => {
    expect(fallbackRelics(seed, { q: 'SPIRIT' }).map(item => item.id)).toEqual(['spirit'])
    expect(fallbackRelics(seed, { q: 'zzzz' })).toEqual([])
  })

  it('keeps the full detail data in the seed for the offline diary', () => {
    const spirit = seed.find(item => item.id === 'spirit')!
    expect(spirit.scenes.length).toBeGreaterThan(0)
    expect(spirit.steps.length).toBeGreaterThan(0)
    expect(spirit.body.length).toBeGreaterThan(0)
  })

  it('preserves the panel shape used by the scene', () => {
    const item = toPanelItem(seed[0]!)
    expect(item).toMatchObject({
      id: seed[0]!.id,
      slug: seed[0]!.id,
      name: seed[0]!.name,
      status: seed[0]!.status,
      location: seed[0]!.location,
    })
  })
})
