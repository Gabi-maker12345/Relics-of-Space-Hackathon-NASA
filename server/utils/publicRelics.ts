import type { H3Event } from 'h3'
import { createError, getQuery, getRouterParam, setHeader } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Relic, RelicPanelItem } from '#shared/types/relic'
import { findRelic } from './relicInput'
import { PUBLIC_CACHE_CONTROL, loadRelicDto, mapDbToRelicPanel } from './relicMapper'

export interface PublicRelicsFilterOptions {
  location?: string
  status?: string
  q?: string
  sort?: 'name' | 'date' | 'created_at' | string
  order?: 'asc' | 'desc' | string
}

/**
 * Lightweight panel list for the public home page with filters and search (BE-08, BE-09).
 * Supports:
 * - `location`: filter by location ('moon' | 'mars' | 'deep_space')
 * - `status`: filter by status ('active' | 'silent' | 'lost')
 * - `q`: search by relic name (case-insensitive)
 * - `sort`: sort by 'name' or 'created_at' (default: 'created_at')
 * - `order`: 'asc' (default) or 'desc'
 */
export async function getPublicRelicsList(
  supabase: SupabaseClient<Database>,
  event: H3Event,
  overrides?: PublicRelicsFilterOptions,
): Promise<RelicPanelItem[]> {
  const query = overrides ?? (getQuery(event) as PublicRelicsFilterOptions)

  const location = typeof query.location === 'string' ? query.location.trim() : undefined
  const status = typeof query.status === 'string' ? query.status.trim() : undefined
  const rawQ = typeof query.q === 'string' ? query.q.trim() : undefined
  const sort = typeof query.sort === 'string' ? query.sort.trim().toLowerCase() : 'created_at'
  const isAsc = query.order ? query.order.toLowerCase() !== 'desc' : true

  let dbQuery = supabase
    .from('relics')
    .select('id, slug, name, summary, mission, status, location, ratio, alt, cover_media_id, created_at')
    .eq('published', true)

  if (location) {
    dbQuery = dbQuery.eq('location', location)
  }

  if (status) {
    dbQuery = dbQuery.eq('status', status)
  }

  if (rawQ) {
    // Escape PostgREST wildcard characters to prevent pattern injection
    const sanitizedQ = rawQ.replace(/[%_]/g, '\\$&')
    dbQuery = dbQuery.ilike('name', `%${sanitizedQ}%`)
  }

  if (sort === 'name') {
    dbQuery = dbQuery.order('name', { ascending: isAsc })
  } else {
    dbQuery = dbQuery.order('created_at', { ascending: isAsc }).order('name', { ascending: true })
  }

  const { data: relics, error } = await dbQuery

  if (error || !relics) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  if (relics.length === 0) {
    setHeader(event, 'Cache-Control', PUBLIC_CACHE_CONTROL)
    return []
  }

  const relicIds = relics.map(r => r.id)
  let mediaRows: Database['public']['Tables']['relic_media']['Row'][] = []

  const { data: media } = await supabase
    .from('relic_media')
    .select('id, relic_id, type, url, poster_url, position')
    .in('relic_id', relicIds)
    .order('position', { ascending: true })

  if (media) {
    mediaRows = media as Database['public']['Tables']['relic_media']['Row'][]
  }

  const mediaByRelic = new Map<string, Database['public']['Tables']['relic_media']['Row'][]>()
  for (const item of mediaRows) {
    const list = mediaByRelic.get(item.relic_id) || []
    list.push(item)
    mediaByRelic.set(item.relic_id, list)
  }

  setHeader(event, 'Cache-Control', PUBLIC_CACHE_CONTROL)

  return relics.map((relic) => {
    const relicMedia = mediaByRelic.get(relic.id) || []
    const coverMedia = relicMedia.find(m => m.id === relic.cover_media_id)
      ?? relicMedia.find(m => m.type === 'image')
      ?? relicMedia[0]
      ?? null

    return mapDbToRelicPanel(relic, coverMedia)
  })
}

/**
 * Full detail endpoint for a single relic by slug (BE-08).
 * Returns technical sheet (facts), ordered narration steps, scenes, and quiz questions.
 * Returns 404 for nonexistent or draft relics.
 */
export async function getPublicRelicDetail(
  supabase: SupabaseClient<Database>,
  event: H3Event,
  idOrSlug?: string,
): Promise<Relic> {
  const identifier = idOrSlug || getRouterParam(event, 'slug') || getRouterParam(event, 'id')
  if (!identifier) {
    throw createError({ statusCode: 400, message: 'Missing id or slug' })
  }

  const relic = await findRelic(supabase, identifier)

  if (!relic || !relic.published) {
    throw createError({ statusCode: 404, statusMessage: 'Relic not found', message: 'Relic not found' })
  }

  setHeader(event, 'Cache-Control', PUBLIC_CACHE_CONTROL)

  return loadRelicDto(supabase, relic)
}
