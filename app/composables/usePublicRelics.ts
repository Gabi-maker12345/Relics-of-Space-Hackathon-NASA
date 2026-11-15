import type { RelicPanelItem } from '#shared/types/relic'
import type { RelicFilters } from '~/utils/relicFilters'
import { fetchReliable } from '~/utils/resilient'
import { panelFromSeed } from '~/utils/seedFallback'

/**
 * Public ring data, filtered server-side by BE-09. The async key is stable and
 * the query is watched, so Nuxt refetches on every filter change and the SSR
 * payload already carries the filtered list.
 *
 * FE-18: the chosen language is part of the query, so switching PT/EN refetches
 * the same list with translated content and localized audio.
 *
 * #82: a API falhar não deixa a cena preta — a lista cai para o seed local e a
 * UI mostra um aviso com "Tentar de novo".
 */
export function usePublicRelics(filters: Ref<RelicFilters>) {
  const { lang } = useLocale()
  useLocale().load()

  const query = computed(() => ({ ...toRelicQuery(filters.value), lang: lang.value }))
  const offline = useState<boolean>('public-relics-offline', () => false)

  const { data, pending, error, refresh } = useAsyncData<RelicPanelItem[]>(
    'public-relics',
    async () => {
      try {
        const items = await fetchReliable<RelicPanelItem[]>(
          $fetch,
          '/api/public/relics',
          { query: query.value },
          { timeoutMs: 8000, retries: 1 },
        )
        offline.value = false
        return items
      }
      catch {
        offline.value = true
        return panelFromSeed(filters.value)
      }
    },
    {
      default: () => [] as RelicPanelItem[],
      watch: [query],
    },
  )

  const relics = computed(() => data.value ?? [])

  return { relics, pending, error, refresh, offline }
}
