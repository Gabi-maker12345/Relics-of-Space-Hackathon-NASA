import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import dataset from '../data/relics.json'
import { missionMarquee, relics } from '../app/data/relics'

const expectedSlugs = [
  'apollo-lunar-module',
  'opportunity',
  'viking-1',
  'spirit',
  'sojourner',
  'ingenuity',
  'apollo-lunar-roving-vehicle',
  'surveyor-3',
  'voyager-1',
  'voyager-2',
  'pioneer-10',
  'pioneer-11',
]

/** Minimal JPEG SOF reader — avoids pulling an image library into the tests. */
function jpegSize(path: string): { width: number, height: number } {
  const buffer = readFileSync(path)
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error(`${path} is not a JPEG`)

  let offset = 2
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = buffer[offset + 1]
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2
      continue
    }
    if (marker === 0xda) break
    const length = buffer.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + length
  }
  throw new Error(`${path}: no JPEG dimensions found`)
}

/** Minimal MP3 check: ID3 tag or an MPEG frame sync. */
function isMp3(path: string): boolean {
  const buffer = readFileSync(path)
  return (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33)
    || buffer[0] === 0xff
}

const seed = dataset.relics
const media = seed.flatMap(relic => relic.media.map(item => ({ slug: relic.slug, ...item })))

describe('relic seed dataset (BE-14)', () => {
  it('contains the 12 expected relics with unique slugs and ids', () => {
    expect(seed.map(relic => relic.slug).sort()).toEqual([...expectedSlugs].sort())
    expect(new Set(seed.map(relic => relic.slug)).size).toBe(seed.length)
    expect(new Set(seed.map(relic => relic.id)).size).toBe(seed.length)
    expect(new Set(media.map(item => item.id)).size).toBe(media.length)
  })

  it('gives every relic a fact sheet, published state and a cover image', () => {
    for (const relic of seed) {
      expect(relic.published, relic.slug).toBe(true)
      expect(relic.facts.length, relic.slug).toBeGreaterThanOrEqual(4)
      expect(relic.media.length, relic.slug).toBeGreaterThanOrEqual(1)
      expect(relic.media[0].type, relic.slug).toBe('image')
      expect(relic.ratio, relic.slug).toBe('16 / 9')
      expect(relic.reference_url, relic.slug).toMatch(/^https:\/\//)
      expect(typeof relic.is_extra, relic.slug).toBe('boolean')
      expect(['moon', 'mars', 'deep_space']).toContain(relic.location)
      expect(['active', 'silent', 'lost']).toContain(relic.status)
    }

    expect(seed.filter(relic => relic.is_extra).map(relic => relic.slug)).toEqual(['voyager-1', 'voyager-2'])
  })

  it('attributes every media item to an official source', () => {
    for (const item of media) {
      expect(item.credit, `${item.slug}/${item.file}`).toMatch(/NASA/)
      expect(item.source_url, `${item.slug}/${item.file}`).toMatch(/^https:\/\/images\.nasa\.gov\/details\//)
      expect(item.kicker, `${item.slug}/${item.file}`).not.toBe('')
      expect(item.title, `${item.slug}/${item.file}`).not.toBe('')
      expect(item.caption, `${item.slug}/${item.file}`).not.toBe('')
    }
  })

  it('ships every media file as a non-empty 1600x900 JPEG', () => {
    for (const item of media) {
      const path = resolve('public/images/relics', item.file)
      expect(existsSync(path), path).toBe(true)
      expect(statSync(path).size, path).toBeGreaterThan(20_000)
      expect(jpegSize(path), path).toEqual({ width: 1600, height: 900 })
    }
  })

  it('ships narration audio for the intro and every scene', () => {
    for (const relic of seed) {
      expect(relic.intro_audio_url, relic.slug).toBe(`/media/narration/${relic.slug}-intro.mp3`)
      const intro = resolve('public', relic.intro_audio_url!.replace(/^\//, ''))
      expect(existsSync(intro), intro).toBe(true)
      expect(statSync(intro).size, intro).toBeGreaterThan(20_000)
      expect(isMp3(intro), intro).toBe(true)

      relic.media.forEach((item, index) => {
        expect(item.audio_url, `${relic.slug}/${item.file}`).toBe(`/media/narration/${relic.slug}-scene-${index + 1}.mp3`)
        const path = resolve('public', item.audio_url!.replace(/^\//, ''))
        expect(existsSync(path), path).toBe(true)
        expect(statSync(path).size, path).toBeGreaterThan(10_000)
        expect(isMp3(path), path).toBe(true)
      })
    }
  })

  it('keeps the SSR fallback in sync with the dataset', () => {
    expect(relics).toHaveLength(seed.length)

    for (const [index, relic] of relics.entries()) {
      const source = seed[index]
      expect(relic.id).toBe(source.slug)
      expect(relic.name).toBe(source.name)
      expect(relic.mission).toBe(source.mission)
      expect(relic.tagline).toBe(source.summary)
      expect(relic.body).toBe(source.story_text)
      expect(relic.alt).toBe(source.alt)
      expect(relic.ratio).toBe(source.ratio)
      expect(relic.status).toBe(source.status)
      expect(relic.location).toBe(source.location)
      expect(relic.published).toBe(source.published)
      expect(relic.reference_url).toBe(source.reference_url)
      expect(relic.is_extra).toBe(source.is_extra)
      expect(relic.image).toBe(`/images/relics/${source.media[0].file}`)
      expect(relic.scenes).toHaveLength(source.media.length)
      expect(relic.scenes[0].is_cover).toBe(true)
      expect(relic.scenes.every(scene => scene.source_url && scene.credit)).toBe(true)
      expect(relic.steps).toHaveLength(source.media.length + 1)
      expect(relic.steps[0]).toMatchObject({ index: 0, type: 'intro', caption: source.summary })
      expect(relic.steps[0].audio_url).toBe(source.intro_audio_url)
      source.media.forEach((item, position) => {
        expect(relic.steps[position + 1].audio_url).toBe(item.audio_url)
      })
      expect(relic.total_steps).toBe(relic.steps.length)
    }
  })

  it('lists every relic in the hero marquee', () => {
    expect(new Set(missionMarquee).size).toBe(missionMarquee.length)
    for (const relic of relics) expect(missionMarquee).toContain(relic.name)
  })
})
