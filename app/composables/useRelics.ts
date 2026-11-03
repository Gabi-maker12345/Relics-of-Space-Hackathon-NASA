import { relics as seedRelics } from '~/data/relics'
import type { Relic } from '~/data/relics'

const STORAGE_KEY = 'space-relics:relics:v1'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * Fonte única das relíquias: começa no seed (`data/relics.ts`) e passa a viver
 * em localStorage assim que o admin grava. SSR usa sempre o seed.
 */
export function useRelics() {
  const relics = useState<Relic[]>('relics-list', () => clone(seedRelics))
  const loaded = useState<boolean>('relics-loaded', () => false)

  const load = (): void => {
    if (!import.meta.client || loaded.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) relics.value = parsed as Relic[]
      }
    } catch {
      /* storage indisponível: segue com o seed */
    }
    loaded.value = true
  }

  const persist = (): void => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(relics.value))
    } catch {
      /* quota cheia: mantém em memória */
    }
  }

  const create = (relic: Relic): void => {
    relics.value = [...relics.value, relic]
    persist()
  }

  const update = (id: string, patch: Relic): void => {
    relics.value = relics.value.map(relic => (relic.id === id ? patch : relic))
    persist()
  }

  const remove = (id: string): void => {
    relics.value = relics.value.filter(relic => relic.id !== id)
    persist()
  }

  const reset = (): void => {
    relics.value = clone(seedRelics)
    persist()
  }

  return { relics, loaded, load, create, update, remove, reset }
}
