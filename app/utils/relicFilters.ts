import type { RelicLocation, RelicStatus } from '#shared/types/relic'

/** State kept in the URL for the home ring (FE-05). */
export interface RelicFilters {
  location?: RelicLocation
  status?: RelicStatus
  q: string
}

export const RELIC_FILTER_KEYS = ['location', 'status', 'q'] as const

export const LOCATION_OPTIONS = [
  { value: 'moon', label: 'Lua' },
  { value: 'mars', label: 'Marte' },
  { value: 'deep_space', label: 'Espaço profundo' },
] as const satisfies readonly { value: RelicLocation, label: string }[]

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativa' },
  { value: 'silent', label: 'Silenciosa' },
  { value: 'lost', label: 'Perdida' },
] as const satisfies readonly { value: RelicStatus, label: string }[]

const LOCATION_VALUES = new Set<string>(LOCATION_OPTIONS.map(option => option.value))
const STATUS_VALUES = new Set<string>(STATUS_OPTIONS.map(option => option.value))

/** Query values arrive as string | string[] | null; take the first usable one. */
function firstValue(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed === '' ? undefined : trimmed
}

function isLocation(value: string | undefined): value is RelicLocation {
  return value !== undefined && LOCATION_VALUES.has(value)
}

function isStatus(value: string | undefined): value is RelicStatus {
  return value !== undefined && STATUS_VALUES.has(value)
}

/**
 * Normalises an untrusted query string into filters. Unknown values are
 * dropped instead of failing, so a stale link still renders a list.
 */
export function parseRelicFilters(query: Record<string, unknown> = {}): RelicFilters {
  const location = firstValue(query.location)
  const status = firstValue(query.status)
  const q = firstValue(query.q)?.slice(0, 120) ?? ''

  return {
    location: isLocation(location) ? location : undefined,
    status: isStatus(status) ? status : undefined,
    q,
  }
}

/** Only the non-empty filters, ready for `router.replace({ query })` and `$fetch`. */
export function toRelicQuery(filters: RelicFilters): Record<string, string> {
  const query: Record<string, string> = {}
  if (filters.location) query.location = filters.location
  if (filters.status) query.status = filters.status
  const q = filters.q.trim()
  if (q) query.q = q
  return query
}

export function hasActiveRelicFilters(filters: RelicFilters): boolean {
  return Boolean(filters.location || filters.status || filters.q.trim())
}
