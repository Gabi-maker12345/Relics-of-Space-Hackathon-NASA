let wiredClient = false
let lastFocused: HTMLElement | null = null

/**
 * Estado do painel de acesso. O login é DOM puro (sem o antigo "hole"/anel GL
 * do portal); Escape e clique fora fecham. A fiação regista-se uma vez no client.
 */
export type PanelName = 'profile' | null

export function usePanels() {
  const active = useState<PanelName>('panel', () => null)

  const applyEngine = (next: PanelName): void => {
    if (typeof window === 'undefined') return
    document.documentElement.dataset.panel = next ?? ''
  }

  /**
   * Devolve o foco ao elemento que abriu o painel. O gatilho pode ter
   * desaparecido (o menu fecha ao abrir o login), por isso o burger do
   * cabeçalho serve de fallback visível.
   */
  const restoreFocus = (): void => {
    const target = lastFocused
    lastFocused = null
    if (typeof document === 'undefined') return
    const focusable = (el: HTMLElement | null): el is HTMLElement => {
      if (!el || !el.isConnected || el.getClientRects().length === 0) return false
      // O menu fechado fica `visibility: hidden`: o focus() falhava em silêncio.
      return typeof el.checkVisibility === 'function'
        ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
        : true
    }
    if (focusable(target)) {
      target.focus({ preventScroll: true })
      return
    }
    document.querySelector<HTMLElement>('.fr-burger')?.focus({ preventScroll: true })
  }

  const open = (name: Exclude<PanelName, null>): void => {
    if (active.value === name) return
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      lastFocused = document.activeElement
    }
    active.value = name
    applyEngine(name)
  }

  const close = (): void => {
    if (active.value === null) return
    active.value = null
    applyEngine(null)
    restoreFocus()
  }

  const toggle = (name: Exclude<PanelName, null>): void => {
    if (active.value === name) close()
    else open(name)
  }

  if (import.meta.client && !wiredClient) {
    wiredClient = true

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && active.value !== null) {
        e.preventDefault()
        close()
      }
    }
    const onDown = (e: PointerEvent): void => {
      if (active.value === null) return
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-gl-shield]')) return
      if (target.closest('button')) return
      if (target.closest('a')) return
      close()
    }
    onMounted(() => {
      window.addEventListener('keydown', onKey)
      window.addEventListener('pointerdown', onDown, true)
      applyEngine(active.value)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, true)
    })
  }

  return { active, open, close, toggle }
}
