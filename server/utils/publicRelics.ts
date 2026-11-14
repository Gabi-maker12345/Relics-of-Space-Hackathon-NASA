import type { H3Event } from 'h3'
import { createError, getQuery, getRouterParam, setHeader } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Relic, RelicPanelItem } from '#shared/types/relic'
import { DEFAULT_LANG, normalizeLang } from './i18n'
import { findRelic } from './relicInput'
import { PUBLIC_CACHE_CONTROL, loadRelicDto, mapDbToRelicPanel } from './relicMapper'

export interface PublicRelicsFilterOptions {
  location?: string
  status?: string
  q?: string
  lang?: string
  sort?: 'name' | 'date' | 'created_at' | string
  order?: 'asc' | 'desc' | string
}

/**
 * Lightweight panel list for the public home page with filters, search, and i18n (BE-08, BE-09, BE-12).
 * Supports:
 * - `location`: filter by location ('moon' | 'mars' | 'deep_space')
 * - `status`: filter by status ('active' | 'silent' | 'lost')
 * - `q`: search by relic name (case-insensitive)
 * - `lang`: language ('pt' or 'en', falls back to PT)
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
  const lang = normalizeLang(query.lang)
  const sort = typeof query.sort === 'string' ? query.sort.trim().toLowerCase() : 'created_at'
  const isAsc = query.order ? query.order.toLowerCase() !== 'desc' : true

  let dbQuery = supabase
    .from('relics')
    .select('id, slug, name, summary, story_text, mission, status, location, ratio, alt, cover_media_id, reference_url, is_extra, created_at')
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

  const { data: rawRelics, error } = await dbQuery

  if (error || !rawRelics) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  if (rawRelics.length === 0) {
    setHeader(event, 'Cache-Control', PUBLIC_CACHE_CONTROL)
    return []
  }

  let relics = rawRelics
  const relicIds = relics.map(r => r.id)

  if (lang !== DEFAULT_LANG) {
    const { data: translations } = await supabase
      .from('relic_translations')
      .select('relic_id, name, summary, story_text, mission, alt')
      .in('relic_id', relicIds)
      .eq('lang', lang)

    if (translations && translations.length > 0) {
      const transByRelic = new Map(translations.map(t => [t.relic_id, t]))
      relics = relics.map((r) => {
        const trans = transByRelic.get(r.id)
        if (!trans) return r
        return {
          ...r,
          name: trans.name?.trim() || r.name,
          summary: trans.summary?.trim() || r.summary,
          story_text: trans.story_text?.trim() || r.story_text,
          mission: trans.mission?.trim() || r.mission,
          alt: trans.alt?.trim() || r.alt,
        }
      })
    }
  }

  let mediaRows: Database['public']['Tables']['relic_media']['Row'][] = []

  const { data: media } = await supabase
    .from('relic_media')
    .select('id, relic_id, type, url, poster_url, position')
    .in('relic_id', relicIds)
    .order('position', { ascending: true })

  if (media) {
    mediaRows = media as Database['public']['Tables']['relic_media']['Row'][]
  }

  const { data: facts } = await supabase
    .from('relic_facts')
    .select('relic_id, label, value, position')
    .in('relic_id', relicIds)
    .order('position', { ascending: true })

  const mediaByRelic = new Map<string, Database['public']['Tables']['relic_media']['Row'][]>()
  for (const item of mediaRows) {
    const list = mediaByRelic.get(item.relic_id) || []
    list.push(item)
    mediaByRelic.set(item.relic_id, list)
  }

  const factsByRelic = new Map<string, Pick<Database['public']['Tables']['relic_facts']['Row'], 'label' | 'value' | 'position'>[]>()
  for (const fact of (facts ?? []) as Pick<Database['public']['Tables']['relic_facts']['Row'], 'relic_id' | 'label' | 'value' | 'position'>[]) {
    const list = factsByRelic.get(fact.relic_id) || []
    list.push(fact)
    factsByRelic.set(fact.relic_id, list)
  }

  setHeader(event, 'Cache-Control', PUBLIC_CACHE_CONTROL)

  return relics.map((relic) => {
    const relicMedia = mediaByRelic.get(relic.id) || []
    const coverMedia = relicMedia.find(m => m.id === relic.cover_media_id)
      ?? relicMedia.find(m => m.type === 'image')
      ?? relicMedia[0]
      ?? null

    return mapDbToRelicPanel(relic, coverMedia, factsByRelic.get(relic.id) ?? [])
  })
}

/**
 * Full detail endpoint for a single relic by slug (BE-08, BE-12).
 * Returns technical sheet (facts), ordered narration steps, scenes, and quiz questions.
 * Supports `?lang=en` with automatic fallback to PT.
 * Returns 404 for nonexistent or draft relics.
 */
export async function getPublicRelicDetail(
  supabase: SupabaseClient<Database>,
  event: H3Event,
  idOrSlug?: string,
  langOverride?: string,
): Promise<Relic> {
  const identifier = idOrSlug || getRouterParam(event, 'slug') || getRouterParam(event, 'id')
  if (!identifier) {
    throw createError({ statusCode: 400, message: 'Missing id or slug' })
  }

  const query = getQuery(event)
  const lang = normalizeLang(langOverride ?? query.lang)

  const relic = await findRelic(supabase, identifier)

  if (!relic || !relic.published) {
    throw createError({ statusCode: 404, statusMessage: 'Relic not found', message: 'Relic not found' })
  }

  setHeader(event, 'Cache-Control', PUBLIC_CACHE_CONTROL)

  return loadRelicDto(supabase, relic, { lang })
}
