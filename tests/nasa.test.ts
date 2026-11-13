import { describe, expect, it } from 'vitest'
import {
  fetchNasaAsset,
  fetchNasaItem,
  normalizeNasaCredit,
  pickImageAsset,
  pickPoster,
  pickVideoAsset,
  searchNasa,
} from '../server/utils/nasa'

const imageItem = {
  data: [{
    nasa_id: 'TEST-IMG',
    title: 'Test image',
    description: 'A test image from NASA.',
    media_type: 'image',
    secondary_creator: 'JPL',
    center: 'JPL',
    date_created: '2020-01-01T00:00:00Z',
  }],
  links: [{ href: 'https://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~thumb.jpg', rel: 'preview' }],
}

const videoItem = {
  data: [{
    nasa_id: 'TEST-VID',
    title: 'Test video',
    description: 'A test video from NASA.',
    media_type: 'video',
    secondary_creator: 'JPL',
    center: 'JPL',
    date_created: '2020-01-01T00:00:00Z',
  }],
  links: [{ href: 'https://images-assets.nasa.gov/video/TEST-VID/TEST-VID~large.jpg', rel: 'preview' }],
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

describe('NASA credits (BE-11)', () => {
  it('keeps full NASA credits and expands known centers', () => {
    expect(normalizeNasaCredit({ secondary_creator: 'NASA/JPL-Caltech' })).toBe('NASA/JPL-Caltech')
    expect(normalizeNasaCredit({ secondary_creator: 'JPL' })).toBe('NASA/JPL-Caltech')
    expect(normalizeNasaCredit({ secondary_creator: 'Jet Propulsion Laboratory' })).toBe('NASA/JPL')
    expect(normalizeNasaCredit({ secondary_creator: 'ARC' })).toBe('NASA/Ames Research Center')
    expect(normalizeNasaCredit({ center: 'GSFC' })).toBe('NASA/GSFC')
    expect(normalizeNasaCredit({ secondary_creator: 'Library of Congress' })).toBe('Library of Congress')
    expect(normalizeNasaCredit({})).toBe('NASA')
  })
})

describe('NASA asset selection (BE-11)', () => {
  const assets = [
    'https://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~thumb.jpg',
    'https://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~small.jpg',
    'https://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~medium.jpg',
    'https://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~orig.jpg',
  ]

  it('prefers the medium image, then falls back to smaller files', () => {
    expect(pickImageAsset(assets)).toContain('~medium.jpg')
    expect(pickImageAsset(assets.filter(url => !url.includes('medium')))).toContain('~small.jpg')
    expect(pickImageAsset(['https://x/a.jpg'])).toContain('a.jpg')
    expect(pickImageAsset(['https://x/a.png'])).toBeNull()
  })

  it('prefers the mobile video and a large poster', () => {
    const videos = [
      'https://images-assets.nasa.gov/video/TEST/TEST~orig.mp4',
      'https://images-assets.nasa.gov/video/TEST/TEST~medium.mp4',
      'https://images-assets.nasa.gov/video/TEST/TEST~mobile.mp4',
      'https://images-assets.nasa.gov/video/TEST/TEST~large.jpg',
      'https://images-assets.nasa.gov/video/TEST/TEST~thumb.jpg',
    ]
    expect(pickVideoAsset(videos)).toContain('~mobile.mp4')
    expect(pickVideoAsset(videos.filter(url => !url.includes('mobile')))).toContain('~medium.mp4')
    expect(pickPoster(videos)).toContain('~large.jpg')
    expect(pickPoster(['https://x/a.png'])).toBeNull()
  })
})

describe('NASA search client (BE-11)', () => {
  it('normalizes an item with credit, thumbnail and source', async () => {
    const calls: string[] = []
    const fetcher = (async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return jsonResponse({ collection: { items: [imageItem], metadata: { total_hits: 1 } } })
    }) as typeof fetch

    const result = await searchNasa({ q: 'apollo 11', mediaType: 'image', page: 2, pageSize: 5 }, fetcher)

    expect(calls[0]).toContain('q=apollo+11')
    expect(calls[0]).toContain('media_type=image')
    expect(calls[0]).toContain('page=2')
    expect(calls[0]).toContain('page_size=5')
    expect(result.total).toBe(1)
    expect(result.items[0]).toMatchObject({
      nasa_id: 'TEST-IMG',
      title: 'Test image',
      media_type: 'image',
      credit: 'NASA/JPL-Caltech',
      source_url: 'https://images.nasa.gov/details/TEST-IMG',
    })
    expect(result.items[0].thumbnail).toContain('~thumb.jpg')
  })

  it('filters audio results out of a mixed search', async () => {
    const fetcher = (async () => jsonResponse({
      collection: { items: [imageItem, audioItem], metadata: { total_hits: 2 } },
    })) as typeof fetch

    const result = await searchNasa({ q: 'mars' }, fetcher)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].media_type).toBe('image')
  })

  it('rejects audio when importing a specific item', async () => {
    const fetcher = (async () => jsonResponse({ collection: { items: [audioItem] } })) as typeof fetch
    await expect(fetchNasaItem('TEST-AUDIO', fetcher)).rejects.toMatchObject({
      name: 'NasaApiError',
      statusCode: 400,
    })
  })

  it('reports NASA failures as a clear 502', async () => {
    const fetcher = (async () => new Response('down', { status: 500 })) as typeof fetch
    await expect(searchNasa({ q: 'mars' }, fetcher)).rejects.toMatchObject({
      name: 'NasaApiError',
      statusCode: 502,
    })
  })

  it('resolves the best asset for images and videos', async () => {
    const fetcher = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/search')) return jsonResponse({ collection: { items: [imageItem] } })
      return jsonResponse([
        'http://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~thumb.jpg',
        'http://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~medium.jpg',
      ])
    }) as typeof fetch

    const item = await fetchNasaItem('TEST-IMG', fetcher)
    const asset = await fetchNasaAsset(item, fetcher)
    expect(asset.kind).toBe('image')
    expect(asset.src).toBe('https://images-assets.nasa.gov/image/TEST-IMG/TEST-IMG~medium.jpg')
    expect(asset.poster).toBeNull()

    const videoFetcher = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/search')) return jsonResponse({ collection: { items: [videoItem] } })
      return jsonResponse([
        'http://images-assets.nasa.gov/video/TEST-VID/TEST-VID~mobile.mp4',
        'http://images-assets.nasa.gov/video/TEST-VID/TEST-VID~large.jpg',
      ])
    }) as typeof fetch

    const video = await fetchNasaAsset(await fetchNasaItem('TEST-VID', videoFetcher), videoFetcher)
    expect(video.kind).toBe('video')
    expect(video.src).toContain('~mobile.mp4')
    expect(video.poster).toContain('~large.jpg')
  })
})
