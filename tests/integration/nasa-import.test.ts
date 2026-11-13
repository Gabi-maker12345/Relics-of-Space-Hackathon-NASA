import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../app/types/database.types'
import { importNasaMedia } from '../../server/utils/nasa'

try {
  loadEnvFile()
}
catch {
  // ignore
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY || ''

type RelicRow = Database['public']['Tables']['relics']['Row']

const imageItem = {
  data: [{
    nasa_id: 'TEST-IMG',
    title: 'Test image',
    description: 'A test image from NASA.',
    media_type: 'image',
    secondary_creator: 'JPL',
    center: 'JPL',
  }],
  links: [{ href: 'http://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~thumb.jpg', rel: 'preview' }],
}

const videoItem = {
  data: [{
    nasa_id: 'TEST-VID',
    title: 'Test video',
    description: 'A test video from NASA.',
    media_type: 'video',
    secondary_creator: 'JPL',
    center: 'JPL',
  }],
  links: [{ href: 'http://images-assets.nasa.gov/video/TEST-VID/TEST-VID~large.jpg', rel: 'preview' }],
}

const audioItem = {
  data: [{
    nasa_id: 'TEST-AUDIO',
    title: 'Test audio',
    media_type: 'audio',
    center: 'JPL',
  }],
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe.skipIf(!serviceKey)('NASA media import (BE-11 integration)', () => {
  const admin = createClient<Database>(url, serviceKey || 'placeholder', { auth: { persistSession: false } })
  const slug = `nasa-import-${randomUUID().slice(0, 8)}`
  let relic = {} as RelicRow

  const fetcher = (async (input: RequestInfo | URL) => {
    const target = String(input)
    if (target.includes('nasa_id=TEST-IMG')) return jsonResponse({ collection: { items: [imageItem] } })
    if (target.includes('nasa_id=TEST-VID')) return jsonResponse({ collection: { items: [videoItem] } })
    if (target.includes('nasa_id=TEST-AUDIO')) return jsonResponse({ collection: { items: [audioItem] } })
    if (target.includes('/image/TEST-IMG/')) {
      return jsonResponse([
        'http://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~thumb.jpg',
        'http://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~small.jpg',
        'http://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~medium.jpg',
        'http://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~orig.jpg',
      ])
    }
    if (target.includes('/video/TEST-VID/')) {
      return jsonResponse([
        'http://images-assets.nasa.gov/video/TEST-VID/TEST-VID~mobile.mp4',
        'http://images-assets.nasa.gov/video/TEST-VID/TEST-VID~large.jpg',
        'http://images-assets.nasa.gov/video/TEST-VID/TEST-VID~thumb.jpg',
      ])
    }
    return new Response('not found', { status: 404 })
  }) as typeof fetch

  beforeAll(async () => {
    const { data, error } = await admin
      .from('relics')
      .insert({
        slug,
        name: 'NASA Import Test',
        mission: 'Test',
        summary: 'Importação de teste.',
        story_text: 'História de teste.',
        status: 'active',
        location: 'mars',
        published: false,
      })
      .select()
      .single()

    expect(error).toBeNull()
    relic = data as RelicRow
  })

  afterAll(async () => {
    if (relic.id) await admin.from('relics').delete().eq('id', relic.id)
  })

  it('imports an image with credit, source and the medium asset', async () => {
    const result = await importNasaMedia(admin, relic, 'TEST-IMG', fetcher)
    expect(result.error).toBeUndefined()

    const { data, error } = await admin
      .from('relic_media')
      .select('*')
      .eq('relic_id', relic.id)
      .order('position')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0]).toMatchObject({
      type: 'image',
      url: 'https://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~medium.jpg',
      poster_url: null,
      kicker: 'Imagem NASA',
      title: 'Test image',
      caption: 'A test image from NASA.',
      credit: 'NASA/JPL-Caltech',
      source_url: 'https://images.nasa.gov/details/TEST-IMG',
      mute_video: false,
      position: 0,
    })
  })

  it('imports a video with its mobile file and large poster', async () => {
    const result = await importNasaMedia(admin, relic, 'TEST-VID', fetcher)
    expect(result.error).toBeUndefined()

    const { data, error } = await admin
      .from('relic_media')
      .select('*')
      .eq('relic_id', relic.id)
      .eq('type', 'video')
      .single()

    expect(error).toBeNull()
    expect(data).toMatchObject({
      type: 'video',
      url: 'https://images-assets.nasa.gov/video/TEST-VID/TEST-VID~mobile.mp4',
      poster_url: 'https://images-assets.nasa.gov/video/TEST-VID/TEST-VID~large.jpg',
      kicker: 'Vídeo NASA',
      credit: 'NASA/JPL-Caltech',
      source_url: 'https://images.nasa.gov/details/TEST-VID',
      mute_video: true,
      position: 1,
    })
  })

  it('rejects audio items instead of inserting an unsupported media type', async () => {
    await expect(importNasaMedia(admin, relic, 'TEST-AUDIO', fetcher)).rejects.toMatchObject({
      name: 'NasaApiError',
      statusCode: 400,
    })
  })
})
