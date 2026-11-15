import { relics as seedRelics } from '~/data/relics'
import type { Relic, RelicInput } from '#shared/types/relic'
import { fetchReliable } from '~/utils/resilient'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * O SSR só precisa dos campos do painel da landing. Factos, cenas e passos
 * chegavam ao payload (e ao HTML) sem serem usados; o detalhe é carregado
 * quando o diário abre.
 */
const seedPanel = (): Relic[] => seedRelics.map(relic => ({
  ...relic,
  facts: [],
  scenes: [],
  steps: [],
  total_steps: 0,
}))

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
  const relics = useState<Relic[]>('relics-list', seedPanel)
  const loadedFor = useState<Mode | null>('relics-loaded-for', () => null)
  const loadedLang = useState<string>('relics-loaded-lang', () => 'pt')
  const { lang } = useLocale()
  const error = useState<string>('relics-error', () => '')
  const route = useRoute()

  // O modo segue a rota, não a sessão: um admin no site público vê a lista
  // pública (traduzida), o painel vê a lista de administração.
  const mode = (): Mode => (route.path.startsWith('/admin') ? 'admin' : 'public')

  const load = async (force = false): Promise<void> => {
    if (!import.meta.client) return
    if (inflight) return inflight

    const current = mode()
    const currentLang = current === 'public' ? lang.value : ''
    if (!force && loadedFor.value === current && loadedLang.value === currentLang) return

    inflight = (async () => {
      error.value = ''
      try {
        const endpoint = current === 'admin' ? '/api/admin/relics' : '/api/public/relics'
        const fetcher = $fetch as unknown as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
        const data = await fetchReliable<Relic[]>(
          fetcher,
          endpoint,
          { query: current === 'public' ? { lang: currentLang } : undefined },
          { timeoutMs: 8000, retries: 1 },
        )
        if (Array.isArray(data)) relics.value = data
        loadedFor.value = current
        loadedLang.value = currentLang
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

  // FE-18: no site público, trocar de idioma recarrega a lista traduzida.
  watch(lang, () => {
    if (mode() === 'public') void load(true)
  })

  // O painel carrega a lista explicitamente depois do `restore()`; o site
  // público não deve refazer o pedido só porque há sessão.

  const create = async (input: RelicInput): Promise<Relic> => {
    const data = await $fetch<Relic>('/api/admin/relics', { method: 'POST', body: input })
    relics.value = [...relics.value, data]
    return data
  }

  const patch = async (id: string, input: Partial<RelicInput>): Promise<Relic> => {
    const data = await $fetch<Relic>(`/api/admin/relics/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: input,
    })
    relics.value = relics.value.map(relic => (relic.id === id ? data : relic))
    return data
  }

  const update = (id: string, input: RelicInput): Promise<Relic> => patch(id, input)

  const remove = async (id: string): Promise<void> => {
    await $fetch(`/api/admin/relics/${encodeURIComponent(id)}`, { method: 'DELETE' })
    relics.value = relics.value.filter(relic => relic.id !== id)
  }

  const reset = (): void => {
    relics.value = clone(seedRelics)
    loadedFor.value = null
  }

  return { relics, loadedFor, error, load, create, update, patch, remove, reset }
}
