import type { RelicPanelItem } from '#shared/types/relic'

/**
 * Public ring data, filtered server-side by BE-09. The async key is stable and
 * the query is watched, so Nuxt refetches on every filter change and the SSR
 * payload already carries the filtered list.
 */
export function usePublicRelics(filters: Ref<RelicFilters>) {
  const query = computed(() => toRelicQuery(filters.value))

  const { data, pending, error, refresh } = useAsyncData<RelicPanelItem[]>(
    'public-relics',
    () => $fetch<RelicPanelItem[]>('/api/public/relics', { query: query.value }),
    {
      default: () => [] as RelicPanelItem[],
      watch: [query],
    },
  )

  const relics = computed(() => data.value ?? [])

  return { relics, pending, error, refresh }
}
