'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { relics as seedRelics, type Relic } from '@/data/relics'

const STORAGE_KEY = 'space-relics:relics:v1'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

type RelicsContextValue = {
  relics: Relic[]
  loaded: boolean
  load: () => void
  create: (relic: Relic) => void
  update: (id: string, relic: Relic) => void
  remove: (id: string) => void
  reset: () => void
}

const RelicsContext = createContext<RelicsContextValue | null>(null)

export function RelicsProvider({ children }: { children: React.ReactNode }) {
  const [relics, setRelics] = useState<Relic[]>(() => clone(seedRelics))
  const [loaded, setLoaded] = useState(false)

  const persist = useCallback((next: Relic[]) => {
    setRelics(next)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* quota cheia: mantém em memória */
    }
  }, [])

  const load = useCallback(() => {
    if (typeof window === 'undefined') return
    setLoaded((already) => {
      if (already) return already
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed: unknown = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) setRelics(parsed as Relic[])
        }
      } catch {
        /* segue com o seed */
      }
      return true
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const value = useMemo<RelicsContextValue>(
    () => ({
      relics,
      loaded,
      load,
      create: (relic) => persist([...relics, relic]),
      update: (id, relic) => persist(relics.map((item) => (item.id === id ? relic : item))),
      remove: (id) => persist(relics.filter((item) => item.id !== id)),
      reset: () => persist(clone(seedRelics)),
    }),
    [relics, loaded, load, persist],
  )

  return <RelicsContext.Provider value={value}>{children}</RelicsContext.Provider>
}

export function useRelics(): RelicsContextValue {
  const value = useContext(RelicsContext)
  if (!value) throw new Error('useRelics fora de <RelicsProvider>')
  return value
}
