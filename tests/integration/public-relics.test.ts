import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import type { Database } from '../../app/types/database.types'
import { getPublicRelicDetail, getPublicRelicsList } from '../../server/utils/publicRelics'

try {
  loadEnvFile()
} catch {
  // ignore
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY || ''

describe.skipIf(!serviceKey || !anonKey)('public relics endpoints (BE-08 & BE-09 integration)', () => {
  const admin = createClient<Database>(url, serviceKey || 'placeholder', { auth: { persistSession: false } })
  const anon = createClient<Database>(url, anonKey || 'placeholder', { auth: { persistSession: false } })

  const marsSlug = `mars-test-${randomUUID().slice(0, 8)}`
  const moonSlug = `moon-test-${randomUUID().slice(0, 8)}`
  const draftSlug = `draft-test-${randomUUID().slice(0, 8)}`

  let marsId = ''
  let moonId = ''
  let draftId = ''

  const createMockEvent = (
    path: string,
    params: Record<string, string> = {},
    query: Record<string, string> = {},
  ) => {
    const headers: Record<string, string> = {}
    return {
      path,
      context: { params },
      node: {
        req: { url: path },
        res: {
          setHeader: (name: string, value: string) => {
            headers[name.toLowerCase()] = value
          },
          getHeader: (name: string) => headers[name.toLowerCase()],
        },
      },
      __query: query,
    } as unknown as H3Event
  }

  beforeAll(async () => {
    // 1. Insert active Mars relic
    const { data: marsData, error: marsErr } = await admin
      .from('relics')
      .insert({
        slug: marsSlug,
        name: 'Curiosity Mars Rover Alpha',
        mission: 'Mars Science Laboratory',
        summary: 'Rover em Marte ativo',
        story_text: 'História longa em Marte.',
        published: true,
        status: 'active',
        location: 'mars',
      })
      .select()
      .single()

    expect(marsErr).toBeNull()
    marsId = marsData!.id

    // Add media and quiz to Mars relic
    const { data: mediaData } = await admin
      .from('relic_media')
      .insert([
        {
          relic_id: marsId,
          type: 'image',
          url: '/images/mars-rover.jpg',
          caption: 'Cena da relíquia pública',
          position: 0,
        },
        {
          relic_id: marsId,
          type: 'video',
          url: '/media/mars-loop.mp4',
          poster_url: '/images/mars-poster.jpg',
          caption: 'Vídeo da relíquia',
          position: 1,
        },
      ])
      .select()

    const coverItem = mediaData?.find(m => m.type === 'image')
    if (coverItem) {
      await admin.from('relics').update({ cover_media_id: coverItem.id }).eq('id', marsId)
    }

    await admin.from('relic_facts').insert({
      relic_id: marsId,
      label: 'Velocidade',
      value: '20.000 km/h',
      position: 0,
    })

    const { data: quizData } = await admin.from('quiz_questions').insert({
      relic_id: marsId,
      position: 0,
      question: 'Qual é o destino desta missão?',
      options: ['Lua', 'Marte', 'Vênus'],
      correct_index: 1,
      explanation: 'A missão foi enviada para Marte.',
    }).select().single()

    // Translations for BE-12
    await admin.from('relic_translations').insert({
      relic_id: marsId,
      lang: 'en',
      name: 'Curiosity Mars Rover (EN)',
      summary: 'Active rover on Mars (EN)',
      story_text: 'Long story in Mars (EN).',
      intro_audio_url: '/media/en-intro.mp3',
    })

    const firstMedia = mediaData?.[0]
    if (firstMedia) {
      await admin.from('media_translations').insert({
        media_id: firstMedia.id,
        lang: 'en',
        title: 'Martian Landscape',
        caption: 'English caption for the first scene',
        audio_url: '/media/en-scene-1.mp3',
      })
    }

    if (quizData) {
      await admin.from('quiz_question_translations').insert({
        question_id: quizData.id,
        lang: 'en',
        question: 'What is the destination of this mission?',
        explanation: 'The mission was sent to Mars.',
      })
    }

    // 2. Insert silent Moon relic
    const { data: moonData, error: moonErr } = await admin
      .from('relics')
      .insert({
        slug: moonSlug,
        name: 'Surveyor Moon Lander Beta',
        mission: 'Surveyor Program',
        summary: 'Pousador na Lua inativo',
        story_text: 'História na Lua.',
        published: true,
        status: 'silent',
        location: 'moon',
      })
      .select()
      .single()

    expect(moonErr).toBeNull()
    moonId = moonData!.id

    // 3. Insert draft (unpublished) relic
    const { data: draftData, error: draftErr } = await admin
      .from('relics')
      .insert({
        slug: draftSlug,
        name: 'Top Secret Draft Probe',
        mission: 'Secret Mission',
        summary: 'Draft summary',
        story_text: 'Top secret draft story',
        published: false,
        status: 'active',
        location: 'deep_space',
      })
      .select()
      .single()

    expect(draftErr).toBeNull()
    draftId = draftData!.id
  })

  afterAll(async () => {
    if (marsId) await admin.from('relics').delete().eq('id', marsId)
    if (moonId) await admin.from('relics').delete().eq('id', moonId)
    if (draftId) await admin.from('relics').delete().eq('id', draftId)
  })

  it('lists published relics with lightweight panel fields only (BE-08)', async () => {
    const event = createMockEvent('/api/public/relics')
    const list = await getPublicRelicsList(anon, event)

    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)

    // The draft relic must NOT appear in the public list
    const foundDraft = list.find(r => r.slug === draftSlug)
    expect(foundDraft).toBeUndefined()

    // The published relic must appear
    const item = list.find(r => r.slug === marsSlug)
    expect(item).toBeDefined()
    expect(item).toMatchObject({
      id: marsSlug,
      slug: marsSlug,
      name: 'Curiosity Mars Rover Alpha',
      summary: 'Rover em Marte ativo',
      tagline: 'Rover em Marte ativo',
      status: 'active',
      location: 'mars',
      cover_type: 'image',
      image: '/images/mars-rover.jpg',
      body: 'História longa em Marte.',
      facts: [{ label: 'Velocidade', value: '20.000 km/h' }],
    })

    // Panel item must NOT have heavy fields
    expect((item as Record<string, unknown>).story_text).toBeUndefined()
    expect((item as Record<string, unknown>).scenes).toBeUndefined()
    expect((item as Record<string, unknown>).steps).toBeUndefined()
    expect((item as Record<string, unknown>).warnings).toBeUndefined()

    // Cache-Control header was set
    expect(event.node.res.getHeader('cache-control')).toContain('public')
    expect(event.node.res.getHeader('cache-control')).toContain('max-age=60')
  })

  it('returns full detail (facts, steps, scenes, quiz) for a published relic (BE-08)', async () => {
    const event = createMockEvent(`/api/public/relics/${marsSlug}`, { id: marsSlug })
    const detail = await getPublicRelicDetail(anon, event, marsSlug)

    expect(detail).toBeDefined()
    expect(detail.id).toBe(marsSlug)
    expect(detail.name).toBe('Curiosity Mars Rover Alpha')
    expect(detail.body).toBe('História longa em Marte.')

    // Facts
    expect(detail.facts).toEqual([{ label: 'Velocidade', value: '20.000 km/h' }])

    // Scenes
    expect(detail.scenes).toHaveLength(2)

    // Steps (intro + 2 media steps = 3)
    expect(detail.steps).toHaveLength(3)
    expect(detail.steps[0]).toMatchObject({ index: 0, type: 'intro' })
    expect(detail.total_steps).toBe(3)

    // Quiz questions
    expect(detail.quiz).toHaveLength(1)
    expect(detail.quiz![0]).toMatchObject({
      position: 0,
      question: 'Qual é o destino desta missão?',
      options: ['Lua', 'Marte', 'Vênus'],
      explanation: 'A missão foi enviada para Marte.',
    })

    // Warnings must NOT be exposed on public responses
    expect(detail.warnings).toBeUndefined()

    // Cache-Control header was set
    expect(event.node.res.getHeader('cache-control')).toContain('public')
    expect(event.node.res.getHeader('cache-control')).toContain('max-age=60')
  })

  it('returns 404 when querying an unpublished draft relic (BE-08)', async () => {
    const event = createMockEvent(`/api/public/relics/${draftSlug}`, { id: draftSlug })
    await expect(getPublicRelicDetail(anon, event, draftSlug)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Relic not found',
    })
  })

  it('returns 404 when querying a nonexistent slug (BE-08)', async () => {
    const event = createMockEvent('/api/public/relics/nonexistent-relic', { id: 'nonexistent-relic' })
    await expect(getPublicRelicDetail(anon, event, 'nonexistent-relic')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Relic not found',
    })
  })

  // BE-09 Tests: Filters & Search
  it('filters by location (BE-09)', async () => {
    const event = createMockEvent('/api/public/relics')
    const marsList = await getPublicRelicsList(anon, event, { location: 'mars' })
    expect(marsList.some(r => r.slug === marsSlug)).toBe(true)
    expect(marsList.some(r => r.slug === moonSlug)).toBe(false)

    const moonList = await getPublicRelicsList(anon, event, { location: 'moon' })
    expect(moonList.some(r => r.slug === moonSlug)).toBe(true)
    expect(moonList.some(r => r.slug === marsSlug)).toBe(false)
  })

  it('filters by status (BE-09)', async () => {
    const event = createMockEvent('/api/public/relics')
    const activeList = await getPublicRelicsList(anon, event, { status: 'active' })
    expect(activeList.some(r => r.slug === marsSlug)).toBe(true)
    expect(activeList.some(r => r.slug === moonSlug)).toBe(false)

    const silentList = await getPublicRelicsList(anon, event, { status: 'silent' })
    expect(silentList.some(r => r.slug === moonSlug)).toBe(true)
    expect(silentList.some(r => r.slug === marsSlug)).toBe(false)
  })

  it('searches relics by name with q parameter (BE-09)', async () => {
    const event = createMockEvent('/api/public/relics')
    const roverSearch = await getPublicRelicsList(anon, event, { q: 'Curiosity' })
    expect(roverSearch.some(r => r.slug === marsSlug)).toBe(true)
    expect(roverSearch.some(r => r.slug === moonSlug)).toBe(false)

    const landerSearch = await getPublicRelicsList(anon, event, { q: 'Surveyor' })
    expect(landerSearch.some(r => r.slug === moonSlug)).toBe(true)
    expect(landerSearch.some(r => r.slug === marsSlug)).toBe(false)
  })

  it('combines location, status, and search filters with correct intersection (BE-09)', async () => {
    const event = createMockEvent('/api/public/relics')
    const matched = await getPublicRelicsList(anon, event, {
      location: 'mars',
      status: 'active',
      q: 'Rover',
    })
    expect(matched.some(r => r.slug === marsSlug)).toBe(true)
    expect(matched.some(r => r.slug === moonSlug)).toBe(false)
  })

  it('returns an empty array when filters match nothing (BE-09)', async () => {
    const event = createMockEvent('/api/public/relics')
    // No active relics on the moon in our test set
    const emptyResult = await getPublicRelicsList(anon, event, {
      location: 'deep_space',
      q: 'NonExistentRelicName12345',
    })
    expect(Array.isArray(emptyResult)).toBe(true)
    expect(emptyResult).toHaveLength(0)
    expect(event.node.res.getHeader('cache-control')).toContain('public')
  })

  it('sorts relics by name or date (BE-09)', async () => {
    const event = createMockEvent('/api/public/relics')
    const sortedByNameAsc = await getPublicRelicsList(anon, event, { sort: 'name', order: 'asc' })
    const names = sortedByNameAsc.map(r => r.name)
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sortedNames)

    const sortedByNameDesc = await getPublicRelicsList(anon, event, { sort: 'name', order: 'desc' })
    const namesDesc = sortedByNameDesc.map(r => r.name)
    expect(namesDesc).toEqual([...sortedNames].reverse())
  })

  // BE-12 Tests: i18n and Fallback
  it('returns translated names and summaries on the public list when lang=en (BE-12)', async () => {
    const event = createMockEvent('/api/public/relics')
    const list = await getPublicRelicsList(anon, event, { lang: 'en' })

    const mars = list.find(r => r.slug === marsSlug)
    expect(mars).toBeDefined()
    expect(mars!.name).toBe('Curiosity Mars Rover (EN)')
    expect(mars!.summary).toBe('Active rover on Mars (EN)')

    // Moon relic had no EN translation: falls back to base Portuguese
    const moon = list.find(r => r.slug === moonSlug)
    expect(moon).toBeDefined()
    expect(moon!.name).toBe('Surveyor Moon Lander Beta')
    expect(moon!.summary).toBe('Pousador na Lua inativo')
  })

  it('returns full translated detail (texts, audio, steps, quiz) when lang=en (BE-12)', async () => {
    const event = createMockEvent(`/api/public/relics/${marsSlug}?lang=en`, { slug: marsSlug })
    const detail = await getPublicRelicDetail(anon, event, marsSlug, 'en')

    expect(detail.name).toBe('Curiosity Mars Rover (EN)')
    expect(detail.tagline).toBe('Active rover on Mars (EN)')
    expect(detail.intro_audio_url).toBe('/media/en-intro.mp3')

    // Scene 1 has English translation
    expect(detail.scenes[0]).toMatchObject({
      title: 'Martian Landscape',
      body: 'English caption for the first scene',
      audio_url: '/media/en-scene-1.mp3',
    })

    // Scene 2 had no translation: falls back to PT caption
    expect(detail.scenes[1].body).toBe('Vídeo da relíquia')

    // Steps reflect the English narration
    expect(detail.steps[0]).toMatchObject({
      title: 'Curiosity Mars Rover (EN)',
      caption: 'Long story in Mars (EN).',
      audio_url: '/media/en-intro.mp3',
    })
    expect(detail.steps[1]).toMatchObject({
      title: 'Martian Landscape',
      caption: 'English caption for the first scene',
      audio_url: '/media/en-scene-1.mp3',
    })

    // Quiz is translated
    expect(detail.quiz).toHaveLength(1)
    expect(detail.quiz![0].question).toBe('What is the destination of this mission?')
    expect(detail.quiz![0].explanation).toBe('The mission was sent to Mars.')
  })

  it('falls back seamlessly to Portuguese when requesting a missing language (BE-12)', async () => {
    const event = createMockEvent(`/api/public/relics/${marsSlug}?lang=fr`, { slug: marsSlug })
    const detail = await getPublicRelicDetail(anon, event, marsSlug, 'fr')

    // Everything falls back to base PT values without error
    expect(detail.name).toBe('Curiosity Mars Rover Alpha')
    expect(detail.tagline).toBe('Rover em Marte ativo')
    expect(detail.steps[0].title).toBe('Curiosity Mars Rover Alpha')
    expect(detail.quiz![0].question).toBe('Qual é o destino desta missão?')
  })
})
