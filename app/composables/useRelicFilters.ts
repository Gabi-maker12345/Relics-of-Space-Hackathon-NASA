import type { RelicLocation, RelicStatus } from '#shared/types/relic'

/**
 * Filters for the home ring, kept in the URL as the single source of truth
 * (FE-05). Chips write immediately; the search input is debounced.
 */
export function useRelicFilters() {
  const route = useRoute()
  const router = useRouter()

  const filters = computed(() => parseRelicFilters(route.query as Record<string, unknown>))
  const hasFilters = computed(() => hasActiveRelicFilters(filters.value))

  const search = ref(filters.value.q)
  let debounce: NodeJS.Timeout | undefined

  // Back/forward and "Limpar" must flow back into the input.
  watch(filters, (next) => {
    if (next.q !== search.value) search.value = next.q
  })

  watch(search, (value) => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      if (value.trim() === filters.value.q) return
      apply({ ...filters.value, q: value })
    }, 250)
  })

  onBeforeUnmount(() => {
    clearTimeout(debounce)
    debounce = undefined
  })

  function apply(next: RelicFilters): void {
    const query: Record<string, string> = {}
    for (const [key, value] of Object.entries(route.query)) {
      if ((RELIC_FILTER_KEYS as readonly string[]).includes(key)) continue
      if (typeof value === 'string' && value !== '') query[key] = value
    }
    Object.assign(query, toRelicQuery(next))
    void router.replace({ query })
  }

  function toggleLocation(value: RelicLocation): void {
    apply({ ...filters.value, location: filters.value.location === value ? undefined : value })
  }

  function toggleStatus(value: RelicStatus): void {
    apply({ ...filters.value, status: filters.value.status === value ? undefined : value })
  }

  function clear(): void {
    clearTimeout(debounce)
    debounce = undefined
    search.value = ''
    apply({ q: '' })
  }

  return { filters, search, hasFilters, toggleLocation, toggleStatus, clear }
}
