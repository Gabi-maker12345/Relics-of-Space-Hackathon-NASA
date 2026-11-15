import type { Relic, RelicPanelItem } from '#shared/types/relic'
import type { RelicFilters } from './relicFilters'

/**
 * Maps a full seed relic to the lightweight shape returned by
 * `/api/public/relics`, so the landing and the scene can render without the API.
 */
export function toPanelItem(relic: Relic): RelicPanelItem {
  const cover = relic.scenes?.[0]
  return {
    id: relic.id,
    slug: relic.id,
    name: relic.name,
    summary: relic.tagline ?? '',
    tagline: relic.tagline ?? '',
    status: relic.status ?? 'active',
    location: relic.location ?? 'moon',
    mission: relic.mission,
    ratio: relic.ratio,
    image: relic.image,
    body: relic.body,
    cover_type: cover?.kind ?? null,
    cover: cover
      ? {
          type: cover.kind,
          url: cover.src,
          poster_url: cover.poster ?? null,
        }
      : null,
    facts: relic.facts ?? [],
    reference_url: relic.reference_url ?? null,
    is_extra: relic.is_extra ?? false,
  }
}

/**
 * Offline list used when `/api/public/relics` fails. Applies the same
 * location/status/search filters as the API; content is the Portuguese seed.
 */
export function fallbackRelics(
  seed: readonly Relic[],
  filters: RelicFilters,
): RelicPanelItem[] {
  const query = filters.q.trim().toLowerCase()

  return seed
    .filter(relic => relic.published !== false)
    .filter(relic => !filters.location || (relic.location ?? 'moon') === filters.location)
    .filter(relic => !filters.status || (relic.status ?? 'active') === filters.status)
    .filter(relic => !query || relic.name.toLowerCase().includes(query))
    .map(toPanelItem)
}
