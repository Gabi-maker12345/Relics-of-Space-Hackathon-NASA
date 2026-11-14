import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { addMedia, mediaInputSchema } from './media'

type RelicRow = Database['public']['Tables']['relics']['Row']

const NASA_SEARCH_URL = 'https://images-api.nasa.gov/search'
const NASA_ASSETS_URL = 'https://images-assets.nasa.gov'
const NASA_DETAILS_URL = 'https://images.nasa.gov/details'

/** Query accepted by `GET /api/admin/nasa/search`. */
export const nasaSearchSchema = z.object({
  q: z.string().trim().min(2, 'A pesquisa precisa de pelo menos 2 caracteres.').max(120),
  media_type: z.enum(['image', 'video']).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(20),
})

/** Body accepted by `POST /api/admin/relics/:id/media/import`. */
export const nasaImportSchema = z.object({
  nasa_id: z.string().trim().min(1, 'Indica o identificador da NASA.').max(200),
})

export type ParsedNasaSearch = z.infer<typeof nasaSearchSchema>

export interface NasaSearchItem {
  nasa_id: string
  title: string
  description: string
  media_type: 'image' | 'video'
  thumbnail: string
  credit: string
  source_url: string
  date_created: string | null
  center: string | null
}

export interface NasaSearchResult {
  items: NasaSearchItem[]
  total: number
  page: number
  pageSize: number
}

export interface NasaAsset {
  kind: 'image' | 'video'
  src: string
  poster: string | null
  item: NasaSearchItem
}

interface NasaApiData {
  nasa_id?: string
  title?: string
  description?: string
  description_508?: string
  media_type?: string
  secondary_creator?: string
  center?: string
  date_created?: string
}

interface NasaApiLink {
  href?: string
  rel?: string
}

interface NasaApiItem {
  data?: NasaApiData[]
  links?: NasaApiLink[]
}

interface NasaApiResponse {
  collection?: {
    items?: NasaApiItem[]
    metadata?: { total_hits?: number }
  }
}

/** Error carrying the HTTP status the endpoint should return. */
export class NasaApiError extends Error {
  constructor(message: string, readonly statusCode = 502) {
    super(message)
    this.name = 'NasaApiError'
  }
}

const CENTER_CREDITS: Record<string, string> = {
  ARC: 'NASA/Ames Research Center',
  DFRC: 'NASA/DFRC',
  GRC: 'NASA/GRC',
  GSFC: 'NASA/GSFC',
  HQ: 'NASA',
  JPL: 'NASA/JPL-Caltech',
  JSC: 'NASA/JSC',
  KSC: 'NASA/KSC',
  MSFC: 'NASA/MSFC',
  'Jet Propulsion Laboratory': 'NASA/JPL',
}

/**
 * Normalises the credit shown next to a NASA asset.
 *
 * The API sometimes returns a full credit (`NASA/JPL-Caltech`), sometimes just
 * the center (`JPL`, `ARC`), and sometimes a non-NASA source (Library of
 * Congress). Known centers get the full name; unknown creators are kept as-is
 * so the attribution stays truthful.
 */
export function normalizeNasaCredit(data: Pick<NasaApiData, 'secondary_creator' | 'center'>): string {
  const creator = data.secondary_creator?.trim() || ''
  const center = data.center?.trim() || ''

  if (creator && /^NASA\b/i.test(creator)) return creator
  if (creator && CENTER_CREDITS[creator]) return CENTER_CREDITS[creator]
  if (creator && /NASA/i.test(creator)) return creator
  if (creator) return creator
  if (center && CENTER_CREDITS[center]) return CENTER_CREDITS[center]
  if (center) return `NASA/${center}`
  return 'NASA'
}

function detailUrl(nasaId: string): string {
  return `${NASA_DETAILS_URL}/${encodeURIComponent(nasaId)}`
}

function encodeAsset(url: string): string {
  return encodeURI(url.replace(/^http:\/\//i, 'https://'))
}

function assetList(urls: string[]): string[] {
  return urls.map(url => url.replace(/^http:\/\//i, 'https://'))
}

export function pickImageAsset(urls: string[]): string | null {
  const preferred = ['~medium.jpg', '~large.jpg', '~small.jpg', '~orig.jpg']
  for (const suffix of preferred) {
    const found = urls.find(url => url.toLowerCase().endsWith(suffix))
    if (found) return found
  }
  return urls.find(url => /\.jpe?g$/i.test(url)) ?? null
}

export function pickVideoAsset(urls: string[]): string | null {
  const preferred = ['~mobile.mp4', '~small.mp4', '~medium.mp4', '~large.mp4', '~orig.mp4']
  for (const suffix of preferred) {
    const found = urls.find(url => url.toLowerCase().endsWith(suffix))
    if (found) return found
  }
  return urls.find(url => /\.mp4$/i.test(url)) ?? null
}

export function pickPoster(urls: string[]): string | null {
  const preferred = ['~large.jpg', '~medium.jpg', '~thumb.jpg', '~small.jpg']
  for (const suffix of preferred) {
    const found = urls.find(url => url.toLowerCase().endsWith(suffix))
    if (found) return found
  }
  return urls.find(url => /\.jpe?g$/i.test(url)) ?? null
}

/** Turns one NASA search item into the shape used by the admin. `null` for audio. */
export function normalizeSearchItem(item: NasaApiItem): NasaSearchItem | null {
  const data = item.data?.[0]
  if (!data?.nasa_id) return null
  if (data.media_type !== 'image' && data.media_type !== 'video') return null

  const thumbnail = item.links?.find(link => link.rel === 'preview')?.href
    ?? item.links?.[0]?.href
    ?? ''

  return {
    nasa_id: data.nasa_id,
    title: data.title?.trim() || data.nasa_id,
    description: data.description?.trim() || data.description_508?.trim() || '',
    media_type: data.media_type,
    thumbnail: thumbnail ? encodeAsset(thumbnail) : '',
    credit: normalizeNasaCredit(data),
    source_url: detailUrl(data.nasa_id),
    date_created: data.date_created ?? null,
    center: data.center ?? null,
  }
}

async function getJson(url: URL, fetcher: typeof fetch, notFoundMessage: string): Promise<NasaApiResponse> {
  let response: Response
  try {
    response = await fetcher(url.toString(), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido'
    throw new NasaApiError(`Falha ao contactar a NASA: ${message}`, 502)
  }

  if (response.status === 404) throw new NasaApiError(notFoundMessage, 404)
  if (!response.ok) throw new NasaApiError(`A NASA respondeu ${response.status}.`, 502)

  const payload: unknown = await response.json()
  if (typeof payload !== 'object' || payload === null) {
    throw new NasaApiError('Resposta inesperada da NASA.', 502)
  }
  return payload as NasaApiResponse
}

/** Searches the official NASA Image and Video Library. */
export async function searchNasa(
  options: { q: string, mediaType?: 'image' | 'video', page?: number, pageSize?: number },
  fetcher: typeof fetch = fetch,
): Promise<NasaSearchResult> {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 20
  const url = new URL(NASA_SEARCH_URL)
  url.searchParams.set('q', options.q)
  if (options.mediaType) url.searchParams.set('media_type', options.mediaType)
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', String(pageSize))

  const payload = await getJson(url, fetcher, 'Pesquisa da NASA sem resultados.')
  const items = (payload.collection?.items ?? [])
    .map(normalizeSearchItem)
    .filter((item): item is NasaSearchItem => item !== null)

  return {
    items,
    total: payload.collection?.metadata?.total_hits ?? items.length,
    page,
    pageSize,
  }
}

/** Resolves one NASA id to a normalised item with credit and source. */
export async function fetchNasaItem(
  nasaId: string,
  fetcher: typeof fetch = fetch,
): Promise<NasaSearchItem> {
  const url = new URL(NASA_SEARCH_URL)
  url.searchParams.set('nasa_id', nasaId)

  const payload = await getJson(url, fetcher, 'Item da NASA não encontrado.')
  const item = payload.collection?.items?.[0]
  const normalized = item ? normalizeSearchItem(item) : null
  if (!normalized) {
    throw new NasaApiError('Apenas imagens e vídeos podem ser importados.', 400)
  }
  return normalized
}

/** Loads the asset list and picks the best image/video plus its poster. */
export async function fetchNasaAsset(
  item: NasaSearchItem,
  fetcher: typeof fetch = fetch,
): Promise<NasaAsset> {
  const kindPath = item.media_type === 'video' ? 'video' : 'image'
  const url = new URL(`${NASA_ASSETS_URL}/${kindPath}/${encodeURIComponent(item.nasa_id)}/collection.json`)

  let response: Response
  try {
    response = await fetcher(url.toString(), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido'
    throw new NasaApiError(`Falha ao contactar a NASA: ${message}`, 502)
  }
  if (!response.ok) throw new NasaApiError(`A NASA respondeu ${response.status}.`, 502)

  const payload: unknown = await response.json()
  const urls = Array.isArray(payload) ? assetList(payload.filter((value): value is string => typeof value === 'string')) : []

  if (item.media_type === 'video') {
    const src = pickVideoAsset(urls)
    if (!src) throw new NasaApiError('O vídeo da NASA não tem um ficheiro MP4.', 502)
    const poster = pickPoster(urls) ?? (item.thumbnail || null)
    return { kind: 'video', src: encodeAsset(src), poster: poster ? encodeAsset(poster) : null, item }
  }

  const src = pickImageAsset(urls)
  if (!src) throw new NasaApiError('A imagem da NASA não tem um ficheiro JPG.', 502)
  return { kind: 'image', src: encodeAsset(src), poster: null, item }
}

/**
 * Imports one NASA item into a relic, referencing the official asset URL
 * instead of copying the file. Credits and source are filled automatically.
 */
export async function importNasaMedia(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  nasaId: string,
  fetcher: typeof fetch = fetch,
): Promise<{ error?: string }> {
  const item = await fetchNasaItem(nasaId, fetcher)
  const asset = await fetchNasaAsset(item, fetcher)

  const parsed = mediaInputSchema.safeParse({
    kind: asset.kind,
    src: asset.src,
    poster: asset.poster,
    kicker: asset.kind === 'video' ? 'Vídeo NASA' : 'Imagem NASA',
    title: item.title.slice(0, 300),
    // A caption is required by the admin form; fall back to the title so an
    // item without a description is never dropped on the next save.
    body: (item.description || item.title).slice(0, 4000),
    credit: (item.credit || 'NASA').slice(0, 300),
    source_url: item.source_url,
    mute_video: asset.kind === 'video',
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Mídia da NASA inválida.' }
  }

  const result = await addMedia(client, relic, parsed.data)
  return result.error ? { error: result.error } : {}
}
