import { relics as seedRelics } from '~/data/relics'
import type { Relic } from '~/data/relics'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * Fonte única das relíquias: tenta carregar da API (pública/admin conforme contexto),
 * cai para seed em caso de falha ou em SSR.
 */
export function useRelics() {
  const relics = useState<Relic[]>('relics-list', () => clone(seedRelics))
  const loaded = useState<boolean>('relics-loaded', () => false)
  const { user } = useAuth()

  const load = async (): Promise<void> => {
    if (!import.meta.client || loaded.value) return
    try {
      if (user.value) {
        const data = await $fetch<Relic[]>('/api/admin/relics')
        if (Array.isArray(data) && data.length > 0) {
          relics.value = data
        }
      }
      else {
        const data = await $fetch<Relic[]>('/api/public/relics')
        if (Array.isArray(data) && data.length > 0) {
          relics.value = data
        }
      }
    }
    catch {
      // Mantém seed em caso de falha
    }
    loaded.value = true
  }

  const create = async (relic: Relic): Promise<void> => {
    try {
      const data = await $fetch<Relic>('/api/admin/relics', { method: 'POST', body: relic })
      relics.value = [...relics.value, data]
    }
    catch {
      relics.value = [...relics.value, relic]
    }
  }

  const update = async (id: string, patch: Relic): Promise<void> => {
    try {
      const data = await $fetch<Relic>(`/api/admin/relics/${id}`, { method: 'PUT', body: patch })
      relics.value = relics.value.map(relic => (relic.id === id ? data : relic))
    }
    catch {
      relics.value = relics.value.map(relic => (relic.id === id ? patch : relic))
    }
  }

  const remove = async (id: string): Promise<void> => {
    try {
      await $fetch(`/api/admin/relics/${id}`, { method: 'DELETE' })
    }
    catch {
      /* ignora erro e remove localmente */
    }
    relics.value = relics.value.filter(relic => relic.id !== id)
  }

  const reset = (): void => {
    relics.value = clone(seedRelics)
  }

  return { relics, loaded, load, create, update, remove, reset }
}
