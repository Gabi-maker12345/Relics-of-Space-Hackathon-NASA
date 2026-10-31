let wiredClient = false

/**
 * Estado do painel Profile e sincronização com o engine:
 * - abrir/fechar o "hole" (portal) com os tempos do original
 * - Escape e clique fora fecham
 * A fiação (listeners) é registada uma única vez no client.
 */
export type PanelName = 'profile' | null

function shieldEl(name: Exclude<PanelName, null>): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-gl-shield][data-shield="${name}"]`)
}

export function usePanels() {
  const active = useState<PanelName>('panel', () => null)

  const applyEngine = (next: PanelName): void => {
    if (typeof window === 'undefined') return
    const engine = useGlEngine()
    for (const name of ['profile'] as const) {
      const el = shieldEl(name)
      if (el) engine.setShieldOpen(el, next === name)
    }
    document.documentElement.dataset.panel = next ?? ''
    engine.openHole(next !== null)
    if (next !== null) {
      engine.defer(200, () => {
        const el = shieldEl(next)
        if (el) engine.replayShield(el)
      })
    }
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
      // painéis começam fechados: garante o gate do engine
      applyEngine(active.value)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, true)
    })
  }

  return { active, open, close, toggle }
}
