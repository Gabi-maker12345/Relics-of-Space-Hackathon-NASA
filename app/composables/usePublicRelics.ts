import type { RelicPanelItem } from '#shared/types/relic'

/**
 * Public ring data, filtered server-side by BE-09. The async key is stable and
 * the query is watched, so Nuxt refetches on every filter change and the SSR
 * payload already carries the filtered list.
 *
 * FE-18: the chosen language is part of the query, so switching PT/EN refetches
 * the same list with translated content and localized audio.
 */
export function usePublicRelics(filters: Ref<RelicFilters>) {
  const { lang } = useLocale()
  useLocale().load()

  const query = computed(() => ({ ...toRelicQuery(filters.value), lang: lang.value }))

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
