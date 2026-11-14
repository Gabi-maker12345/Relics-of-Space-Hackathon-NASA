const STORAGE_KEY = 'space-relics:passport:v1'

/**
 * Passaporte espacial (FE-20): guarda no browser as relíquias cujo diário foi
 * levado até ao último degrau. Sem login — a chave segue a família
 * `space-relics:*` usada pelo idioma, som e avatar.
 */
export function usePassport() {
  const explored = useState<string[]>('passport-explored', () => [])
  const loaded = useState<boolean>('passport-loaded', () => false)

  const persist = (): void => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(explored.value))
    }
    catch {
      /* quota cheia: mantém em memória */
    }
  }

  const load = (): void => {
    if (!import.meta.client || loaded.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed)) explored.value = parsed.filter((id): id is string => typeof id === 'string')
    }
    catch {
      /* storage inválido: começa vazio */
    }
    loaded.value = true
  }

  const mark = (id: string): void => {
    if (!id || explored.value.includes(id)) return
    explored.value = [...explored.value, id]
    persist()
  }

  const isExplored = (id: string): boolean => explored.value.includes(id)

  const reset = (): void => {
    explored.value = []
    persist()
  }

  return { explored, count: computed(() => explored.value.length), loaded, load, mark, isExplored, reset }
}
