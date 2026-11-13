import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Relic, RelicScene, SceneKind } from '#shared/types/relic'

type RelicRow = Database['public']['Tables']['relics']['Row']
type FactRow = Database['public']['Tables']['relic_facts']['Row']
type MediaRow = Database['public']['Tables']['relic_media']['Row']

/**
 * Turns database rows into the `Relic` shape the front-end consumes.
 *
 * The public identifier is always the slug: UUIDs never leak into the UI, so
 * URLs stay stable and readable. Media ids are exposed inside `scenes` because
 * the admin needs them to edit, reorder and delete individual items.
 */
export function mapDbToRelic(
  relic: RelicRow,
  facts: FactRow[] = [],
  media: MediaRow[] = [],
): Relic {
  const sortedFacts = [...facts].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const sortedMedia = [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  // The cover may be any media type. Only fall back to the first item when the
  // stored cover was deleted or never set.
  const coverMedia = sortedMedia.find(m => m.id === relic.cover_media_id)
    ?? sortedMedia.find(m => m.type === 'image')
    ?? sortedMedia[0]

  const scenes: RelicScene[] = sortedMedia.map(m => ({
    id: m.id,
    kind: m.type as SceneKind,
    src: m.url,
    poster: m.poster_url || undefined,
    kicker: m.kicker || m.title || '',
    title: m.title || '',
    body: m.caption || '',
    credit: m.credit || '',
    source_url: m.source_url,
    audio_url: m.audio_url,
    mute_video: m.mute_video,
    is_cover: coverMedia?.id === m.id,
  }))

  return {
    id: relic.slug,
    name: relic.name,
    mission: relic.mission || '',
    tagline: relic.summary || '',
    body: relic.story_text || relic.summary || '',
    facts: sortedFacts.map(f => ({ label: f.label, value: f.value })),
    // A video cover is represented by its poster frame: `<img>` cannot play it.
    image: coverMedia ? (coverMedia.type === 'video' ? coverMedia.poster_url ?? '' : coverMedia.url) : '',
    alt: relic.alt || relic.name,
    ratio: relic.ratio || '1376 / 768',
    scenes,
    intro_audio_url: relic.intro_audio_url,
    published: relic.published,
  }
}

/** Loads facts and media for a relic and returns the mapped object. */
export async function loadRelicDto(
  supabase: SupabaseClient<Database>,
  relic: RelicRow,
): Promise<Relic> {
  const [factsRes, mediaRes] = await Promise.all([
    supabase.from('relic_facts').select('*').eq('relic_id', relic.id).order('position'),
    supabase.from('relic_media').select('*').eq('relic_id', relic.id).order('position'),
  ])

  return mapDbToRelic(relic, factsRes.data ?? [], mediaRes.data ?? [])
}
