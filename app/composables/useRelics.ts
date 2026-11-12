import { relics as seedRelics } from '~/data/relics'
import type { Relic, RelicInput } from '#shared/types/relic'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

type Mode = 'admin' | 'public'

/** Evita pedidos duplicados quando `restore()` e a página pedem a lista ao mesmo tempo. */
let inflight: Promise<void> | null = null

/**
 * Fonte única das relíquias.
 *
 * O seed serve de casca para o SSR; assim que o cliente fala com a API passa a
 * ser a única fonte. Erros são expostos em `error` em vez de serem escondidos.
 */
export function useRelics() {
  const relics = useState<Relic[]>('relics-list', () => clone(seedRelics))
  const loadedFor = useState<Mode | null>('relics-loaded-for', () => null)
  const error = useState<string>('relics-error', () => '')
  const { user } = useAuth()

  const mode = (): Mode => (user.value ? 'admin' : 'public')

  const load = async (force = false): Promise<void> => {
    if (!import.meta.client) return
    if (inflight) return inflight

    const current = mode()
    if (!force && loadedFor.value === current) return

    inflight = (async () => {
      error.value = ''
      try {
        const endpoint = current === 'admin' ? '/api/admin/relics' : '/api/public/relics'
        const data = await $fetch<Relic[]>(endpoint)
        if (Array.isArray(data)) relics.value = data
        loadedFor.value = current
      }
      catch (err: unknown) {
        const apiError = err as { data?: { message?: string }, statusMessage?: string, message?: string }
        error.value = apiError.data?.message || apiError.statusMessage || 'Falha ao carregar as relíquias.'
        // Não marca como carregado: a próxima navegação tenta de novo.
        loadedFor.value = null
      }
    })()

    try {
      await inflight
    }
    finally {
      inflight = null
    }
  }

  // Login/logout mudam o que é visível: descarta a lista anterior e recarrega.
  watch(
    () => user.value,
    () => {
      loadedFor.value = null
      void load(true)
    },
  )

  const create = async (input: RelicInput): Promise<Relic> => {
    const data = await $fetch<Relic>('/api/admin/relics', { method: 'POST', body: input })
    relics.value = [...relics.value, data]
    return data
  }

  const update = async (id: string, input: RelicInput): Promise<Relic> => {
    const data = await $fetch<Relic>(`/api/admin/relics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: input,
    })
    relics.value = relics.value.map(relic => (relic.id === id ? data : relic))
    return data
  }

  const remove = async (id: string): Promise<void> => {
    await $fetch(`/api/admin/relics/${encodeURIComponent(id)}`, { method: 'DELETE' })
    relics.value = relics.value.filter(relic => relic.id !== id)
  }

  const reset = (): void => {
    relics.value = clone(seedRelics)
    loadedFor.value = null
  }

  return { relics, loadedFor, error, load, create, update, remove, reset }
}
