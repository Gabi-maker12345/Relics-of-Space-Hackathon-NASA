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

describe.skipIf(!serviceKey || !anonKey)('public relics endpoints (BE-08 integration)', () => {
  const admin = createClient<Database>(url, serviceKey || 'placeholder', { auth: { persistSession: false } })
  const anon = createClient<Database>(url, anonKey || 'placeholder', { auth: { persistSession: false } })

  const publishedSlug = `pub-test-${randomUUID().slice(0, 8)}`
  const draftSlug = `draft-test-${randomUUID().slice(0, 8)}`

  let publishedId = ''
  let draftId = ''

  const createMockEvent = (path: string, params: Record<string, string> = {}) => {
    const headers: Record<string, string> = {}
    return {
      path,
      context: { params },
      node: {
        res: {
          setHeader: (name: string, value: string) => {
            headers[name.toLowerCase()] = value
          },
          getHeader: (name: string) => headers[name.toLowerCase()],
        },
      },
    } as unknown as H3Event
  }

  beforeAll(async () => {
    // 1. Insert published relic
    const { data: pubData, error: pubErr } = await admin
      .from('relics')
      .insert({
        slug: publishedSlug,
        name: 'Public Integration Relic',
        mission: 'Public Mission',
        summary: 'Public Tagline',
        story_text: 'A very long story text that should not appear in the panel list.',
        published: true,
        status: 'active',
        location: 'mars',
      })
      .select()
      .single()

    expect(pubErr).toBeNull()
    publishedId = pubData!.id

    // 2. Add media and quiz to published relic
    const { data: mediaData } = await admin
      .from('relic_media')
      .insert([
        {
          relic_id: publishedId,
          type: 'image',
          url: '/images/pub-relic.jpg',
          caption: 'Cena da relíquia pública',
          position: 0,
        },
        {
          relic_id: publishedId,
          type: 'video',
          url: '/media/pub-loop.mp4',
          poster_url: '/images/pub-poster.jpg',
          caption: 'Vídeo da relíquia',
          position: 1,
        },
      ])
      .select()

    const coverItem = mediaData?.find(m => m.type === 'image')
    if (coverItem) {
      await admin.from('relics').update({ cover_media_id: coverItem.id }).eq('id', publishedId)
    }

    await admin.from('relic_facts').insert({
      relic_id: publishedId,
      label: 'Velocidade',
      value: '20.000 km/h',
      position: 0,
    })

    await admin.from('quiz_questions').insert({
      relic_id: publishedId,
      position: 0,
      question: 'Qual é o destino desta missão?',
      options: ['Lua', 'Marte', 'Vênus'],
      correct_index: 1,
      explanation: 'A missão foi enviada para Marte.',
    })

    // 3. Insert draft (unpublished) relic
    const { data: draftData, error: draftErr } = await admin
      .from('relics')
      .insert({
        slug: draftSlug,
        name: 'Draft Relic',
        mission: 'Secret Mission',
        summary: 'Draft summary',
        story_text: 'Top secret draft story',
        published: false,
      })
      .select()
      .single()

    expect(draftErr).toBeNull()
    draftId = draftData!.id
  })

  afterAll(async () => {
    if (publishedId) await admin.from('relics').delete().eq('id', publishedId)
    if (draftId) await admin.from('relics').delete().eq('id', draftId)
  })

  it('lists published relics with lightweight panel fields only', async () => {
    const event = createMockEvent('/api/public/relics')
    const list = await getPublicRelicsList(anon, event)

    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)

    // The draft relic must NOT appear in the public list
    const foundDraft = list.find(r => r.slug === draftSlug)
    expect(foundDraft).toBeUndefined()

    // The published relic must appear
    const item = list.find(r => r.slug === publishedSlug)
    expect(item).toBeDefined()
    expect(item).toMatchObject({
      id: publishedSlug,
      slug: publishedSlug,
      name: 'Public Integration Relic',
      summary: 'Public Tagline',
      tagline: 'Public Tagline',
      status: 'active',
      location: 'mars',
      cover_type: 'image',
      image: '/images/pub-relic.jpg',
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

  it('returns full detail (facts, steps, scenes, quiz) for a published relic', async () => {
    const event = createMockEvent(`/api/public/relics/${publishedSlug}`, { id: publishedSlug })
    const detail = await getPublicRelicDetail(anon, event, publishedSlug)

    expect(detail).toBeDefined()
    expect(detail.id).toBe(publishedSlug)
    expect(detail.name).toBe('Public Integration Relic')
    expect(detail.body).toBe('A very long story text that should not appear in the panel list.')

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

  it('returns 404 when querying an unpublished draft relic', async () => {
    const event = createMockEvent(`/api/public/relics/${draftSlug}`, { id: draftSlug })
    await expect(getPublicRelicDetail(anon, event, draftSlug)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Relic not found',
    })
  })

  it('returns 404 when querying a nonexistent slug', async () => {
    const event = createMockEvent('/api/public/relics/nonexistent-relic', { id: 'nonexistent-relic' })
    await expect(getPublicRelicDetail(anon, event, 'nonexistent-relic')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Relic not found',
    })
  })
})
