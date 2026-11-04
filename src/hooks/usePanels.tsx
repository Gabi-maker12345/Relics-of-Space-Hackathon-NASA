'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getGlEngine } from '@/lib/gl'

export type PanelName = 'profile' | null

type PanelsContextValue = {
  active: PanelName
  open: (name: Exclude<PanelName, null>) => void
  close: () => void
  toggle: (name: Exclude<PanelName, null>) => void
}

const PanelsContext = createContext<PanelsContextValue | null>(null)

function shieldElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-gl-shield][data-shield="profile"]')
}

export function PanelsProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<PanelName>(null)
  const activeRef = useRef<PanelName>(null)

  const apply = useCallback((next: PanelName) => {
    if (typeof window === 'undefined') return
    const engine = getGlEngine()
    const el = shieldElement()
    if (el) engine.setShieldOpen(el, next === 'profile')
    document.documentElement.dataset.panel = next ?? ''
    engine.openHole(next !== null)
    if (next !== null) {
      // revelação linha a linha (slot-machine) como no original
      engine.defer(200, () => {
        const target = shieldElement()
        if (target) engine.replayShield(target)
      })
    }
  }, [])

  useEffect(() => {
    activeRef.current = active
    apply(active)
  }, [active, apply])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeRef.current !== null) setActive(null)
    }
    const onDown = (event: PointerEvent) => {
      if (activeRef.current === null) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-gl-shield]')) return
      if (target.closest('button')) return
      if (target.closest('a')) return
      setActive(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, true)
    }
  }, [])

  const value = useMemo<PanelsContextValue>(
    () => ({
      active,
      open: (name) => setActive(name),
      close: () => setActive(null),
      toggle: (name) => setActive((current) => (current === name ? null : name)),
    }),
    [active],
  )

  return <PanelsContext.Provider value={value}>{children}</PanelsContext.Provider>
}

export function usePanels(): PanelsContextValue {
  const value = useContext(PanelsContext)
  if (!value) throw new Error('usePanels fora de <PanelsProvider>')
  return value
}
