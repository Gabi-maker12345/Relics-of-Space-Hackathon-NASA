import { describe, expect, it } from 'vitest'
import {
  storageAssetUrl,
  storageBase,
  storageObjectPath,
  toStorageUrl,
} from '../scripts/media-paths.mjs'

const env = {
  SUPABASE_STORAGE_BASE: 'https://example.supabase.co/storage/v1/object/public/relic-media/assets',
}

describe('Storage media paths (BE-21)', () => {
  it('maps public-relative paths to the bucket assets prefix', () => {
    expect(storageObjectPath('images/relics/spirit-1.jpg')).toBe('assets/images/relics/spirit-1.jpg')
    expect(storageObjectPath('media/narration/spirit-intro.mp3')).toBe('assets/media/narration/spirit-intro.mp3')
  })

  it('slugifies accents and spaces like the upload script', () => {
    expect(storageObjectPath('images/Módulo lunar 1.jpg')).toBe('assets/images/Modulo-lunar-1.jpg')
    expect(storageObjectPath('media/áudio/orelha.mp3')).toBe('assets/media/audio/orelha.mp3')
  })

  it('builds absolute URLs from the configured base', () => {
    expect(storageBase(env)).toBe(env.SUPABASE_STORAGE_BASE)
    expect(storageAssetUrl('images/relics/spirit-1.jpg', env))
      .toBe(`${env.SUPABASE_STORAGE_BASE}/images/relics/spirit-1.jpg`)
    expect(storageAssetUrl('media/narration/spirit-intro.mp3', env))
      .toBe(`${env.SUPABASE_STORAGE_BASE}/media/narration/spirit-intro.mp3`)
  })

  it('derives the base from the project URL when no explicit base is set', () => {
    const derived = storageBase({ NUXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/' })
    expect(derived).toBe('https://abc.supabase.co/storage/v1/object/public/relic-media/assets')
  })

  it('keeps absolute URLs and rejects unsupported relative values', () => {
    expect(toStorageUrl('/media/narration/x.mp3', env))
      .toBe(`${env.SUPABASE_STORAGE_BASE}/media/narration/x.mp3`)
    expect(toStorageUrl('https://images.nasa.gov/details/PIA1', env))
      .toBe('https://images.nasa.gov/details/PIA1')
    expect(toStorageUrl(null, env)).toBeNull()
    expect(() => toStorageUrl('images/x.jpg', env)).toThrow(/absolute or start with/)
  })

  it('fails clearly when no base is configured', () => {
    expect(storageBase({})).toBe('')
    expect(() => storageAssetUrl('images/x.jpg', {})).toThrow(/SUPABASE_STORAGE_BASE/)
  })
})
