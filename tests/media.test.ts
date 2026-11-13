import { describe, expect, it } from 'vitest'
import type { Database } from '../app/types/database.types'
import {
  mediaCoverSchema,
  mediaInputSchema,
  mediaOrderSchema,
  mediaPatchSchema,
  mediaToScene,
  toMediaInsert,
  toMediaPatch,
} from '../server/utils/media'

type MediaRow = Database['public']['Tables']['relic_media']['Row']

const RELIC_ID = '11111111-1111-4111-8111-111111111111'
const MEDIA_ID = '22222222-2222-4222-8222-222222222222'

const media = (overrides: Partial<MediaRow> = {}): MediaRow => ({
  id: MEDIA_ID,
  relic_id: RELIC_ID,
  type: 'video',
  url: '/media/loop.mp4',
  poster_url: '/images/poster.jpg',
  kicker: 'Transmissão',
  title: 'Descida',
  caption: 'A descida final.',
  credit: 'NASA',
  source_url: 'https://images.nasa.gov/details/x',
  audio_url: '/media/voice.mp3',
  mute_video: true,
  position: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const fullInput = {
  kind: 'video' as const,
  src: '/media/loop.mp4',
  poster: '/images/poster.jpg',
  kicker: 'Transmissão',
  title: 'Descida',
  body: 'A descida final.',
  credit: 'NASA',
  source_url: 'https://images.nasa.gov/details/x',
  audio_url: '/media/voice.mp3',
  mute_video: true,
  is_cover: true,
  position: 1,
}

describe('mediaInputSchema', () => {
  it('accepts the payload used by the admin media editor', () => {
    const parsed = mediaInputSchema.safeParse(fullInput)
    expect(parsed.success).toBe(true)
  })

  it('accepts any number of items and site-relative paths', () => {
    const parsed = mediaInputSchema.safeParse({ kind: 'image', src: '/images/a.jpg' })
    expect(parsed.success).toBe(true)
    expect(parsed.data?.poster).toBeUndefined()
  })

  it('rejects empty media and unsafe URL schemes', () => {
    expect(mediaInputSchema.safeParse({ kind: 'image', src: '  ' }).success).toBe(false)
    expect(mediaInputSchema.safeParse({ kind: 'image', src: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('rejects an unknown media kind', () => {
    expect(mediaInputSchema.safeParse({ kind: 'audio', src: '/a.mp3' }).success).toBe(false)
  })

  it('accepts partial patches and explicit nulls', () => {
    const parsed = mediaPatchSchema.safeParse({ audio_url: null, is_cover: true })
    expect(parsed.success).toBe(true)
    expect(toMediaPatch(parsed.data!)).toEqual({ audio_url: null })
  })
})

describe('mediaOrderSchema', () => {
  it('requires every id to be a uuid', () => {
    expect(mediaOrderSchema.safeParse({ ids: [MEDIA_ID] }).success).toBe(true)
    expect(mediaOrderSchema.safeParse({ ids: ['not-a-uuid'] }).success).toBe(false)
    expect(mediaOrderSchema.safeParse({ ids: [] }).success).toBe(false)
  })
})

describe('mediaCoverSchema', () => {
  it('accepts a media id or null to clear the cover', () => {
    expect(mediaCoverSchema.safeParse({ media_id: MEDIA_ID }).success).toBe(true)
    expect(mediaCoverSchema.safeParse({ media_id: null }).success).toBe(true)
    expect(mediaCoverSchema.safeParse({}).success).toBe(false)
  })
})

describe('row mapping', () => {
  it('writes every editable column in the shared names', () => {
    const row = toMediaInsert(RELIC_ID, mediaInputSchema.parse(fullInput), 1)

    expect(row).toMatchObject({
      relic_id: RELIC_ID,
      type: 'video',
      url: '/media/loop.mp4',
      poster_url: '/images/poster.jpg',
      kicker: 'Transmissão',
      title: 'Descida',
      caption: 'A descida final.',
      credit: 'NASA',
      source_url: 'https://images.nasa.gov/details/x',
      audio_url: '/media/voice.mp3',
      mute_video: true,
      position: 1,
    })
  })

  it('defaults videos to muted and images to unmuted', () => {
    expect(toMediaInsert(RELIC_ID, mediaInputSchema.parse({ kind: 'video', src: '/v.mp4' }), 0).mute_video).toBe(true)
    expect(toMediaInsert(RELIC_ID, mediaInputSchema.parse({ kind: 'image', src: '/i.jpg' }), 0).mute_video).toBe(false)
  })

  it('normalises empty optional URLs to null', () => {
    const row = toMediaInsert(RELIC_ID, mediaInputSchema.parse({
      kind: 'image',
      src: '/i.jpg',
      poster: '',
      audio_url: '',
      source_url: '',
    }), 0)

    expect(row.poster_url).toBeNull()
    expect(row.audio_url).toBeNull()
    expect(row.source_url).toBeNull()
  })

  it('only patches the fields the request sent', () => {
    expect(toMediaPatch({ body: 'Nova legenda' })).toEqual({ caption: 'Nova legenda' })
    expect(toMediaPatch({ credit: 'NASA/JPL' })).toEqual({ credit: 'NASA/JPL' })
  })
})

describe('mediaToScene', () => {
  it('maps the admin row to the shared scene contract', () => {
    expect(mediaToScene(media(), MEDIA_ID)).toMatchObject({
      id: MEDIA_ID,
      kind: 'video',
      src: '/media/loop.mp4',
      poster: '/images/poster.jpg',
      title: 'Descida',
      body: 'A descida final.',
      credit: 'NASA',
      audio_url: '/media/voice.mp3',
      mute_video: true,
      is_cover: true,
    })
  })

  it('marks only the cover item', () => {
    expect(mediaToScene(media(), null).is_cover).toBe(false)
  })
})
