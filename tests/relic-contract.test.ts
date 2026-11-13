import { describe, expect, it } from 'vitest'
import type { Database } from '../app/types/database.types'
import {
  PUBLIC_CACHE_CONTROL,
  buildSteps,
  buildWarnings,
  mapDbToRelic,
  mapDbToRelicPanel,
} from '../server/utils/relicMapper'
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
type QuizRow = Database['public']['Tables']['quiz_questions']['Row']

const quizQuestion = (overrides: Partial<QuizRow> = {}): QuizRow => ({
  id: '33333333-3333-4333-8333-333333333333',
  relic_id: '11111111-1111-4111-8111-111111111111',
  position: 0,
  question: 'Em que ano pousou na Lua?',
  options: ['1968', '1969', '1970'],
  correct_index: 1,
  explanation: 'Apollo 11 pousou em 20 de julho de 1969.',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

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

describe('narration steps (BE-07)', () => {
  it('starts with the intro step and then one step per media, in order', () => {
    const dto = mapDbToRelic(relic(), [], [
      media({ id: 'v', type: 'video', url: '/media/loop.mp4', poster_url: '/images/p.jpg', title: 'Descida', caption: 'A descida final.', audio_url: '/media/v.mp3', position: 1 }),
      media({ id: 'i', position: 0, audio_url: '/media/i.mp3' }),
    ])

    expect(dto.total_steps).toBe(3)
    expect(dto.steps.map(step => step.index)).toEqual([0, 1, 2])
    expect(dto.steps.map(step => step.type)).toEqual(['intro', 'image', 'video'])
    expect(dto.steps[0]).toMatchObject({
      title: 'Módulo Lunar Apollo',
      caption: 'Seis pousos.',
      audio_url: '/media/intro.mp3',
    })
    expect(dto.steps[1]).toMatchObject({
      media_id: 'i',
      title: 'Fotografia',
      caption: 'A história da cena.',
      audio_url: '/media/i.mp3',
      src: '/images/relics/apollo-lunar-module.jpg',
      poster: undefined,
      credit: 'NASA',
    })
    expect(dto.steps[2]).toMatchObject({
      media_id: 'v',
      title: 'Descida',
      caption: 'A descida final.',
      audio_url: '/media/v.mp3',
      src: '/media/loop.mp4',
      poster: '/images/p.jpg',
    })
  })

  it('returns only the intro step when the relic has no media', () => {
    const dto = mapDbToRelic(relic(), [], [])

    expect(dto.steps).toHaveLength(1)
    expect(dto.steps[0]).toMatchObject({ index: 0, type: 'intro' })
    expect(dto.total_steps).toBe(1)
  })

  it('falls back to the story or the name for the intro caption', () => {
    expect(buildSteps(relic({ summary: '' }), [])[0].caption).toBe('Ficou na superfície.')
    expect(buildSteps(relic({ summary: '', story_text: '' }), [])[0].caption).toBe('Módulo Lunar Apollo')
  })

  it('builds warnings per media without audio or caption', () => {
    const warnings = buildWarnings([
      media({ id: 'a', title: 'Sem áudio', audio_url: null }),
      media({ id: 'b', title: 'Sem legenda', caption: '', audio_url: '/media/b.mp3' }),
      media({ id: 'c', title: 'Completa', caption: 'Ok', audio_url: '/media/c.mp3' }),
    ])

    expect(warnings).toEqual([
      { code: 'media_missing_audio', media_id: 'a', message: '"Sem áudio" não tem áudio próprio.' },
      { code: 'media_missing_caption', media_id: 'b', message: '"Sem legenda" não tem legenda/narração escrita.' },
    ])
  })

  it('only exposes warnings on admin DTOs', () => {
    expect(mapDbToRelic(relic(), [], [media()]).warnings).toBeUndefined()
    expect(mapDbToRelic(relic(), [], [media()], { includeWarnings: true }).warnings).toEqual([
      { code: 'media_missing_audio', media_id: media().id, message: '"Fotografia" não tem áudio próprio.' },
    ])
  })

  it('does not warn when every step is complete', () => {
    expect(buildWarnings([media({ audio_url: '/media/i.mp3', caption: 'Pronta' })])).toEqual([])
  })
})

describe('public reading endpoints (BE-08)', () => {
  it('maps a relic to lightweight panel fields only', () => {
    const row = relic({
      slug: 'apollo-lunar-module',
      name: 'Módulo Lunar Apollo',
      summary: 'Seis pousos.',
      story_text: 'História longa...',
      status: 'silent',
      location: 'moon',
    })
    const imageMedia = media({ id: 'img-1', type: 'image', url: '/images/relics/apollo.jpg' })

    const panel = mapDbToRelicPanel(row, imageMedia)

    expect(panel).toEqual({
      id: 'apollo-lunar-module',
      slug: 'apollo-lunar-module',
      name: 'Módulo Lunar Apollo',
      summary: 'Seis pousos.',
      tagline: 'Seis pousos.',
      status: 'silent',
      location: 'moon',
      mission: 'Apollo 11–17',
      ratio: '1376 / 768',
      image: '/images/relics/apollo.jpg',
      cover_type: 'image',
      cover: {
        type: 'image',
        url: '/images/relics/apollo.jpg',
        poster_url: null,
      },
      facts: [],
    })

    // Confirms heavy fields are NOT exposed on the panel item
    expect((panel as Record<string, unknown>).story_text).toBeUndefined()
    expect((panel as Record<string, unknown>).scenes).toBeUndefined()
    expect((panel as Record<string, unknown>).steps).toBeUndefined()
    expect((panel as Record<string, unknown>).total_steps).toBeUndefined()
    expect((panel as Record<string, unknown>).warnings).toBeUndefined()
  })

  it('maps a video cover using its poster frame', () => {
    const row = relic({ slug: 'video-relic' })
    const videoMedia = media({
      id: 'vid-1',
      type: 'video',
      url: '/media/video.mp4',
      poster_url: '/images/poster.jpg',
    })

    const panel = mapDbToRelicPanel(row, videoMedia)

    expect(panel.cover_type).toBe('video')
    expect(panel.image).toBe('/images/poster.jpg')
    expect(panel.cover).toEqual({
      type: 'video',
      url: '/media/video.mp4',
      poster_url: '/images/poster.jpg',
    })
  })

  it('handles a relic without media gracefully', () => {
    const panel = mapDbToRelicPanel(relic(), null)

    expect(panel.cover).toBeNull()
    expect(panel.cover_type).toBeNull()
    expect(panel.image).toBe('')
  })

  it('maps quiz questions into the full detail DTO ordered by position', () => {
    const q1 = quizQuestion({ position: 1, question: 'Pergunta 2' })
    const q0 = quizQuestion({ position: 0, question: 'Pergunta 1' })

    const dto = mapDbToRelic(relic(), [], [], {}, [q1, q0])

    expect(dto.quiz).toHaveLength(2)
    expect(dto.quiz![0]).toMatchObject({
      position: 0,
      question: 'Pergunta 1',
      options: ['1968', '1969', '1970'],
      explanation: 'Apollo 11 pousou em 20 de julho de 1969.',
    })
    expect(dto.quiz![1]).toMatchObject({
      position: 1,
      question: 'Pergunta 2',
    })
  })

  it('exposes standard Cache-Control headers constant for CDN and browser caching', () => {
    expect(PUBLIC_CACHE_CONTROL).toContain('public')
    expect(PUBLIC_CACHE_CONTROL).toContain('max-age=')
    expect(PUBLIC_CACHE_CONTROL).toContain('stale-while-revalidate=')
  })
})
