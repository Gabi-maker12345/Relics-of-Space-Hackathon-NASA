import type { Relic, RelicPanelItem } from '#shared/types/relic'
import type { RelicFilters } from '~/utils/relicFilters'

type PanelExtras = {
  cover_type?: RelicPanelItem['cover_type']
  cover?: RelicPanelItem['cover']
}

function panelFromRelic(relic: Relic): RelicPanelItem {
  const extra = relic as Relic & PanelExtras
  return {
    id: relic.id,
    slug: relic.id,
    name: relic.name,
    summary: relic.tagline ?? '',
    tagline: relic.tagline ?? '',
    status: relic.status ?? 'active',
    location: relic.location ?? 'moon',
    mission: relic.mission ?? '',
    ratio: relic.ratio,
    image: relic.image,
    body: relic.body ?? '',
    cover_type: extra.cover_type ?? null,
    cover: extra.cover ?? null,
    facts: relic.facts ?? [],
    reference_url: relic.reference_url ?? null,
    is_extra: relic.is_extra ?? false,
  }
}

/**
 * Public ring data.
 *
 * #85: a lista vive num único `useRelics` (um pedido por sessão/idioma); os
 * filtros de local/estado/pesquisa são aplicados aqui, no cliente, sobre os 12
 * registos. A cena deixou de fazer um segundo pedido a `/api/public/relics`
 * sempre que entrava ou mudava um filtro.
 */
export function usePublicRelics(filters: Ref<RelicFilters>) {
  const { relics: source, loadedFor, error: listError, load } = useRelics()
  void load()

  const items = computed(() => source.value
    .filter(relic => relic.published !== false)
    .map(panelFromRelic))

  const relics = computed(() => {
    const q = filters.value.q.trim().toLowerCase()
    return items.value
      .filter(item => !filters.value.location || item.location === filters.value.location)
      .filter(item => !filters.value.status || item.status === filters.value.status)
      .filter(item => !q || item.name.toLowerCase().includes(q))
  })

  const pending = computed(() => loadedFor.value === null && !listError.value)
  const error = computed(() => (listError.value ? new Error(listError.value) : null))
  const offline = computed(() => Boolean(listError.value))
  const refresh = (): Promise<void> => load(true)

  return { relics, pending, error, refresh, offline }
}
