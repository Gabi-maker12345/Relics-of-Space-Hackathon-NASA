let wiredClient = false

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

  const open = (name: Exclude<PanelName, null>): void => {
    if (active.value === name) return
    active.value = name
    applyEngine(name)
  }

  const close = (): void => {
    if (active.value === null) return
    active.value = null
    applyEngine(null)
  }

  const toggle = (name: Exclude<PanelName, null>): void => {
    if (active.value === name) close()
    else open(name)
  }

  if (import.meta.client && !wiredClient) {
    wiredClient = true

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && active.value !== null) close()
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
