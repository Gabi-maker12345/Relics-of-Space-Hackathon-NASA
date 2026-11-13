import type { H3Event } from 'h3'
import { createError, getRouterParam, setHeader } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Relic, RelicPanelItem } from '#shared/types/relic'
import { findRelic } from './relicInput'
import { PUBLIC_CACHE_CONTROL, loadRelicDto, mapDbToRelicPanel } from './relicMapper'

/**
 * Lightweight panel list for the public home page (BE-08).
 * Loads only the columns and cover needed for the cards, avoiding the
 * expensive relational payload of facts, all scenes, narration steps, and transcripts.
 */
export async function getPublicRelicsList(
  supabase: SupabaseClient<Database>,
  event: H3Event,
): Promise<RelicPanelItem[]> {
  const { data: relics, error } = await supabase
    .from('relics')
    .select('id, slug, name, summary, mission, status, location, ratio, alt, cover_media_id, created_at')
    .eq('published', true)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true })

  if (error || !relics) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  const relicIds = relics.map(r => r.id)
  let mediaRows: Database['public']['Tables']['relic_media']['Row'][] = []

  if (relicIds.length > 0) {
    const { data: media } = await supabase
      .from('relic_media')
      .select('id, relic_id, type, url, poster_url, position')
      .in('relic_id', relicIds)
      .order('position', { ascending: true })

    if (media) {
      mediaRows = media as Database['public']['Tables']['relic_media']['Row'][]
    }
  }

  const mediaByRelic = new Map<string, Database['public']['Tables']['relic_media']['Row'][]>()
  for (const item of mediaRows) {
    const list = mediaByRelic.get(item.relic_id) || []
    list.push(item)
    mediaByRelic.set(item.relic_id, list)
  }

  setHeader(event, 'Cache-Control', PUBLIC_CACHE_CONTROL)

  return relics.map((relic) => {
    const media = mediaByRelic.get(relic.id) || []
    const coverMedia = media.find(m => m.id === relic.cover_media_id)
      ?? media.find(m => m.type === 'image')
      ?? media[0]
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
