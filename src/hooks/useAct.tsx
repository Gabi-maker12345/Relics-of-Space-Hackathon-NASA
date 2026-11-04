'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getSmoothScroll } from '@/lib/smoothScroll'
import { getGlEngine } from '@/lib/gl'
import { playSoundtrack, primeSoundtrack, stopSoundtrack } from '@/lib/soundtrack'

export type Act = 'page' | 'cosmos' | 'scene'

type ActContextValue = {
  act: Act
  open: () => void
  enter: () => Promise<void>
  back: () => void
}

const ActContext = createContext<ActContextValue | null>(null)

function lockPage(locked: boolean): void {
  if (typeof window === 'undefined') return
  const lenis = getSmoothScroll()
  if (locked) {
    lenis?.stop()
    document.documentElement.classList.add('is-gated')
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    document.documentElement.classList.remove('is-gated')
    lenis?.start()
  }
}

export function ActProvider({ children }: { children: React.ReactNode }) {
  const [act, setAct] = useState<Act>('page')
  const actRef = useRef<Act>('page')

  const back = useCallback(() => {
    if (actRef.current === 'page') return
    actRef.current = 'page'
    setAct('page')
    delete document.documentElement.dataset.act
    delete document.documentElement.dataset.scene
    lockPage(false)
    stopSoundtrack()
    const archive = document.querySelector<HTMLElement>('.fr-archive')
    if (archive) {
      window.scrollTo({ top: archive.offsetTop + archive.offsetHeight - window.innerHeight })
    }
  }, [])

  const enter = useCallback(async () => {
    if (actRef.current !== 'cosmos') return
    actRef.current = 'scene'
    setAct('scene')
    document.documentElement.dataset.act = 'scene'
    document.documentElement.dataset.scene = 'portfolio'
    const frame = Promise.withResolvers<void>()
    requestAnimationFrame(() => frame.resolve())
    await frame.promise
    const engine = getGlEngine()
    engine.scan()
    const track = document.querySelector<HTMLElement>('[data-carousel]')
    if (track) {
      engine.attachTrack(track)
      engine.resetCarousel()
    }
    engine.enterAll()
    void playSoundtrack()
  }, [])

  const open = useCallback(() => {
    if (actRef.current !== 'page') return
    actRef.current = 'cosmos'
    setAct('cosmos')
    lockPage(true)
    document.documentElement.dataset.act = 'cosmos'
    // o clique é o gesto que autoriza o áudio; a trilha entra muda
    void primeSoundtrack()
  }, [])

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (actRef.current !== 'cosmos') return
      if (event.deltaY > 24) {
        event.preventDefault()
        void enter()
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || actRef.current === 'page') return
      if (document.querySelector('[data-modal]')) return
      back()
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [enter, back])

  const value = useMemo<ActContextValue>(() => ({ act, open, enter, back }), [act, open, enter, back])

  return <ActContext.Provider value={value}>{children}</ActContext.Provider>
}

export function useAct(): ActContextValue {
  const value = useContext(ActContext)
  if (!value) throw new Error('useAct fora de <ActProvider>')
  return value
}
