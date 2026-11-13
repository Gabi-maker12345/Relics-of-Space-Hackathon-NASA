import { describe, expect, it } from 'vitest'
import type { Database } from '../app/types/database.types'
import { mapDbToRelic } from '../server/utils/relicMapper'
import {
  pickCoverId,
  relicInputSchema,
  relicPatchSchema,
  toRelicInsert,
  toRelicPatch,
  validateCover,
} from '../server/utils/relicInput'

type RelicRow = Database['public']['Tables']['relics']['Row']
type FactRow = Database['public']['Tables']['relic_facts']['Row']
type MediaRow = Database['public']['Tables']['relic_media']['Row']

const relic = (overrides: Partial<RelicRow> = {}): RelicRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'apollo-lunar-module',
  name: 'Módulo Lunar Apollo',
  mission: 'Apollo 11–17',
  summary: 'Seis pousos.',
  story_text: 'Ficou na superfície.',
  status: 'silent',
  location: 'moon',
  published: true,
  published_at: '2026-01-01T00:00:00Z',
  cover_media_id: null,
  intro_audio_url: '/media/intro.mp3',
  alt: 'Módulo lunar',
  ratio: '1376 / 768',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const fact = (label: string, value: string, position: number): FactRow => ({
  id: `${label}-id`,
  relic_id: relic().id,
  label,
  value,
  position,
  created_at: '2026-01-01T00:00:00Z',
})

const media = (overrides: Partial<MediaRow> = {}): MediaRow => ({
  id: '22222222-2222-4222-8222-222222222222',
  relic_id: relic().id,
  type: 'image',
  url: '/images/relics/apollo-lunar-module.jpg',
  poster_url: null,
  kicker: 'Fotografia',
  title: '',
  caption: 'A história da cena.',
  credit: 'NASA',
  source_url: null,
  audio_url: null,
  mute_video: true,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('mapDbToRelic', () => {
  it('exposes the slug as the public id, never the UUID', () => {
    const dto = mapDbToRelic(relic())
    expect(dto.id).toBe('apollo-lunar-module')
  })

  it('maps tagline/body/facts and sorts them by position', () => {
    const dto = mapDbToRelic(relic(), [fact('B', '2', 1), fact('A', '1', 0)])
    expect(dto.tagline).toBe('Seis pousos.')
    expect(dto.body).toBe('Ficou na superfície.')
    expect(dto.facts).toEqual([{ label: 'A', value: '1' }, { label: 'B', value: '2' }])
    expect(dto.published).toBe(true)
  })

  it('uses the cover media, falling back to the first image', () => {
    const video = media({ id: 'v', type: 'video', url: '/media/loop.mp4', position: 0 })
    const image = media({ id: 'i', url: '/images/cover.jpg', position: 1 })

    expect(mapDbToRelic(relic({ cover_media_id: 'i' }), [], [video, image]).image).toBe('/images/cover.jpg')
    expect(mapDbToRelic(relic(), [], [video, image]).image).toBe('/images/cover.jpg')
  })

  it('never falls back to the intro audio as a cover', () => {
    expect(mapDbToRelic(relic()).image).toBe('')
  })

  it('maps scenes with poster and narration', () => {
    const dto = mapDbToRelic(relic(), [], [
      media({ id: 'v', type: 'video', url: '/media/loop.mp4', poster_url: '/images/p.jpg', position: 1 }),
      media({ id: 'i', position: 0 }),
    ])

    expect(dto.scenes).toEqual([
      {
        id: 'i',
        kind: 'image',
        src: '/images/relics/apollo-lunar-module.jpg',
        poster: undefined,
        kicker: 'Fotografia',
        title: '',
        body: 'A história da cena.',
        credit: 'NASA',
        source_url: null,
        audio_url: null,
        mute_video: true,
        is_cover: true,
      },
      {
        id: 'v',
        kind: 'video',
        src: '/media/loop.mp4',
        poster: '/images/p.jpg',
        kicker: 'Fotografia',
        title: '',
        body: 'A história da cena.',
        credit: 'NASA',
        source_url: null,
        audio_url: null,
        mute_video: true,
        is_cover: false,
      },
    ])
  })

  it('supports a video cover through its poster frame', () => {
    const video = media({
      id: 'v',
      type: 'video',
      url: '/media/loop.mp4',
      poster_url: '/images/p.jpg',
      position: 0,
      mute_video: true,
      audio_url: '/media/voice.mp3',
      source_url: 'https://images.nasa.gov/details/x',
    })
    const dto = mapDbToRelic(relic({ cover_media_id: 'v' }), [], [video])

    expect(dto.image).toBe('/images/p.jpg')
    expect(dto.scenes[0]).toMatchObject({
      id: 'v',
      is_cover: true,
      mute_video: true,
      audio_url: '/media/voice.mp3',
      source_url: 'https://images.nasa.gov/details/x',
    })
  })

  it('leaves the cover empty for a video without a poster', () => {
    const video = media({ id: 'v', type: 'video', url: '/media/loop.mp4', poster_url: null })
    expect(mapDbToRelic(relic({ cover_media_id: 'v' }), [], [video]).image).toBe('')
  })

  it('exposes the intro audio for the front-end player', () => {
    expect(mapDbToRelic(relic(), [], []).intro_audio_url).toBe('/media/intro.mp3')
  })
})

describe('relicInputSchema', () => {
  it('accepts the payload the admin form sends', () => {
    const parsed = relicInputSchema.safeParse({
      slug: 'apollo-lunar-module',
      name: 'Módulo Lunar Apollo',
      mission: 'Apollo 11–17',
      tagline: 'Seis pousos.',
      body: 'Ficou na superfície.',
      image: '/images/relics/apollo-lunar-module.jpg',
      alt: 'Módulo lunar',
      ratio: '1376 / 768',
      published: true,
      facts: [{ label: 'Primeiro pouso', value: '20 jul 1969' }],
      scenes: [{ kind: 'image', src: '/images/relics/apollo-lunar-module.jpg', kicker: 'Fotografia', body: 'A história.' }],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects a relic without a name', () => {
    expect(relicInputSchema.safeParse({ name: '  ' }).success).toBe(false)
  })

  it('rejects an invalid slug', () => {
    expect(relicInputSchema.safeParse({ name: 'X', slug: 'Não Válido' }).success).toBe(false)
  })

  it('lets a publish toggle be a one-field patch', () => {
    const parsed = relicPatchSchema.safeParse({ published: true })
    expect(parsed.success).toBe(true)
    expect(toRelicPatch(parsed.data!)).toEqual({ published: true })
  })
})

describe('mapping the input to columns', () => {
  it('writes tagline to summary and body to story_text', () => {
    const input = relicInputSchema.parse({
      name: 'Opportunity',
      tagline: 'Uma maratona.',
      body: '45 km em outro mundo.',
      published: true,
    })
    const row = toRelicInsert(input, 'opportunity')
    expect(row.summary).toBe('Uma maratona.')
    expect(row.story_text).toBe('45 km em outro mundo.')
    expect(row.slug).toBe('opportunity')
    expect(row.published).toBe(true)
  })

  it('does not touch the slug on a rename-only patch', () => {
    const patch = toRelicPatch(relicPatchSchema.parse({ name: 'Novo nome' }))
    expect(patch).toEqual({ name: 'Novo nome' })
  })
})

describe('cover rules', () => {
  const scenes = [
    { kind: 'image' as const, src: '/a.jpg', kicker: '', body: '' },
    { kind: 'video' as const, src: '/b.mp4', kicker: '', body: '' },
  ]

  it('accepts a cover that matches a scene', () => {
    expect(validateCover(scenes, '/a.jpg')).toBeNull()
  })

  it('accepts a video cover identified by its poster', () => {
    const withPoster = [{ kind: 'video' as const, src: '/b.mp4', poster: '/b.jpg', kicker: '', body: '' }]
    expect(validateCover(withPoster, '/b.jpg')).toBeNull()
  })

  it('rejects a cover that is not a scene', () => {
    expect(validateCover(scenes, '/other.jpg')).toMatch(/uma das cenas/)
  })

  it('picks the explicit cover or the first image', () => {
    const media = [
      { id: 'v', type: 'video', url: '/b.mp4', poster_url: '/b.jpg' },
      { id: 'i', type: 'image', url: '/a.jpg', poster_url: null },
    ]
    expect(pickCoverId(media, '/a.jpg')).toBe('i')
    expect(pickCoverId(media, '/b.jpg')).toBe('v')
    expect(pickCoverId(media)).toBe('i')
    expect(pickCoverId([media[0]])).toBeNull()
  })
})
