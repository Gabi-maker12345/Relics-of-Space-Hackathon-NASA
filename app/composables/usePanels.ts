let wiredClient = false

export type PanelName = 'profile' | null

/**
 * Estado do painel de acesso. Escape e clique fora fecham.
 * O painel é DOM (formulário), por isso não passa pelo engine GL.
 */
export function usePanels() {
  const active = useState<PanelName>('panel', () => null)

  const sync = (next: PanelName): void => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.panel = next ?? ''
  }

  const open = (name: Exclude<PanelName, null>): void => {
    if (active.value === name) return
    active.value = name
    sync(name)
  }

  const close = (): void => {
    if (active.value === null) return
    active.value = null
    sync(null)
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
      sync(active.value)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, true)
    })
  }

  return { active, open, close, toggle }
}
