import type { RelicPanelItem } from '#shared/types/relic'
import { relics as seedRelics } from '../data/relics'

/**
 * Cópia local do arquivo quando a API pública falha (issue #82).
 *
 * A landing já renderiza o seed; a cena usava só a API e ficava preta. O seed
 * é PT-only e traz a capa; filtros são aplicados aqui com as mesmas regras do
 * servidor (`location`, `status`, `q` sobre o nome).
 */
export interface SeedPanelFilters {
  location?: string
  status?: string
  q?: string
}

export function panelFromSeed(filters: SeedPanelFilters = {}): RelicPanelItem[] {
  const location = filters.location?.trim()
  const status = filters.status?.trim()
  const q = filters.q?.trim().toLowerCase()

  return seedRelics
    .filter(relic => relic.published !== false)
    .filter(relic => !location || relic.location === location)
    .filter(relic => !status || relic.status === status)
    .filter(relic => !q || relic.name.toLowerCase().includes(q))
    .map(relic => ({
      id: relic.id,
      slug: relic.id,
      name: relic.name,
      summary: relic.tagline ?? '',
      tagline: relic.tagline ?? '',
      status: relic.status ?? 'silent',
      location: relic.location ?? 'moon',
      mission: relic.mission ?? '',
      image: relic.image,
      body: relic.body ?? '',
      cover_type: null,
      cover: null,
      ratio: relic.ratio,
      facts: relic.facts ?? [],
      reference_url: relic.reference_url ?? null,
      is_extra: relic.is_extra,
    }))
}
