import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../app/types/database.types'
import { getRelicTranslations, saveRelicTranslations } from '../../server/utils/relicTranslations'

try {
  loadEnvFile()
} catch {
  // ignore
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY || ''

describe.skipIf(!serviceKey)('relic translations storage (BE-12 integration)', () => {
  const admin = createClient<Database>(url, serviceKey || 'placeholder', { auth: { persistSession: false } })

  const slug = `i18n-test-${randomUUID().slice(0, 8)}`
  const otherSlug = `i18n-other-${randomUUID().slice(0, 8)}`
  let relicId = ''
  let otherRelicId = ''
  let mediaId = ''
  let otherMediaId = ''
  let quizId = ''

  beforeAll(async () => {
    const { data: relic, error: relicError } = await admin
      .from('relics')
      .insert({
        slug,
        name: 'Módulo Lunar Apollo',
        mission: 'Apollo 11–17',
        summary: 'Seis pousos.',
        story_text: 'História em português.',
        published: false,
      })
      .select()
      .single()
    expect(relicError).toBeNull()
    relicId = relic!.id

    const { data: media, error: mediaError } = await admin
      .from('relic_media')
      .insert({ relic_id: relicId, type: 'image', url: '/images/apollo.jpg', caption: 'Legenda PT', position: 0 })
      .select()
      .single()
    expect(mediaError).toBeNull()
    mediaId = media!.id

    const { data: quiz, error: quizError } = await admin
      .from('quiz_questions')
      .insert({
        relic_id: relicId,
        position: 0,
        question: 'Qual o ano?',
        options: ['1969', '1970'],
        correct_index: 0,
        explanation: 'Apollo 11 pousou em 1969.',
      })
      .select()
      .single()
    expect(quizError).toBeNull()
    quizId = quiz!.id

    const { data: other, error: otherError } = await admin
      .from('relics')
      .insert({ slug: otherSlug, name: 'Outra relíquia', mission: 'Teste', summary: '', story_text: '' })
      .select()
      .single()
    expect(otherError).toBeNull()
    otherRelicId = other!.id

    const { data: otherMedia, error: otherMediaError } = await admin
      .from('relic_media')
      .insert({ relic_id: otherRelicId, type: 'image', url: '/images/other.jpg', position: 0 })
      .select()
      .single()
    expect(otherMediaError).toBeNull()
    otherMediaId = otherMedia!.id
  })

  afterAll(async () => {
    if (relicId) await admin.from('relics').delete().eq('id', relicId)
    if (otherRelicId) await admin.from('relics').delete().eq('id', otherRelicId)
  })

  it('saves relic, media and quiz translations and reads them back', async () => {
    const result = await saveRelicTranslations(admin, relicId, 'en', {
      name: 'Apollo Lunar Module',
      mission: 'Apollo 11–17',
      summary: 'Six landings.',
      story_text: 'The descent stage stayed behind.',
      intro_audio_url: '/media/en-intro.mp3',
      media: [{ media_id: mediaId, caption: 'English caption', audio_url: '/media/en-scene.mp3' }],
      quiz: [{
        question_id: quizId,
        question: 'Which year?',
        options: ['1969', '1970'],
        explanation: 'Apollo 11 landed in 1969.',
      }],
    })

    expect(result.error).toBeUndefined()
    expect(result.saved).toEqual({ relic: true, media: 1, quiz: 1 })

    const rows = await getRelicTranslations(admin, relicId, 'en')
    expect(rows.relic).toMatchObject({
      name: 'Apollo Lunar Module',
      summary: 'Six landings.',
      intro_audio_url: '/media/en-intro.mp3',
    })
    expect(rows.media[0]).toMatchObject({ caption: 'English caption', audio_url: '/media/en-scene.mp3' })
    expect(rows.quiz[0]).toMatchObject({ question: 'Which year?', explanation: 'Apollo 11 landed in 1969.' })
  })

  it('merges partial updates instead of wiping fields', async () => {
    await saveRelicTranslations(admin, relicId, 'en', { summary: 'Six landings, six sites.' })
    const rows = await getRelicTranslations(admin, relicId, 'en')
    expect(rows.relic?.name).toBe('Apollo Lunar Module')
    expect(rows.relic?.summary).toBe('Six landings, six sites.')
  })

  it('clears an audio URL when null is explicit', async () => {
    await saveRelicTranslations(admin, relicId, 'en', {
      intro_audio_url: null,
      media: [{ media_id: mediaId, audio_url: null }],
    })
    const rows = await getRelicTranslations(admin, relicId, 'en')
    expect(rows.relic?.intro_audio_url).toBeNull()
    expect(rows.media[0].audio_url).toBeNull()
    expect(rows.media[0].caption).toBe('English caption')
  })

  it('rejects a media item that belongs to another relic', async () => {
    const result = await saveRelicTranslations(admin, relicId, 'en', {
      media: [{ media_id: otherMediaId, caption: 'Wrong relic' }],
    })
    expect(result.error).toMatch(/não pertencem a esta relíquia/)

    const rows = await getRelicTranslations(admin, otherRelicId, 'en')
    expect(rows.media).toHaveLength(0)
  })

  it('rejects an unknown quiz question', async () => {
    const result = await saveRelicTranslations(admin, relicId, 'en', {
      quiz: [{ question_id: randomUUID(), question: 'Unknown' }],
    })
    expect(result.error).toMatch(/não pertencem a esta relíquia/)
  })
})
