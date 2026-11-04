'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import type { RelicScene } from '@/data/relics'
import { useRelics } from '@/hooks/useRelics'
import { useProjectModal } from '@/hooks/useProjectModal'
import { useAct } from '@/hooks/useAct'
import { playSoundtrack, stopSoundtrack } from '@/lib/soundtrack'
import { SheetFrame, type SheetFrameHandle } from './SheetFrame'
import { RelicSheet, type RelicSheetHandle } from './RelicSheet'
import { BotNarrator } from './BotNarrator'
import { MediaLightbox } from './MediaLightbox'

export function ProjectModal() {
  const { relics } = useRelics()
  const { activeSlug, open, close } = useProjectModal()
  const { act } = useAct()

  const relic = relics.find((item) => item.id === activeSlug) ?? null

  const [mounted, setMounted] = useState(false)
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState<RelicScene | null>(null)
  const [glitching, setGlitching] = useState(false)
  const [typing, setTyping] = useState(false)
  const [armed, setArmed] = useState(false)

  const frameRef = useRef<SheetFrameHandle | null>(null)
  const sheetRef = useRef<RelicSheetHandle | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const glitchTimers = useRef<number[]>([])
  const glitchVoice = useRef<HTMLAudioElement | null>(null)
  const closing = useRef(false)
  const wasOpen = useRef(false)

  const sceneCount = relic?.scenes.length ?? 1
  const progress = (index + 1) / sceneCount

  useEffect(() => setMounted(true), [])

  const clearGlitch = useCallback(() => {
    glitchTimers.current.forEach((timer) => window.clearTimeout(timer))
    glitchTimers.current = []
    setGlitching(false)
  }, [])

  /** O "diário perdido" pisca 3 vezes, cada uma com o seu som. */
  const runGlitch = useCallback(() => {
    const voice = (): HTMLAudioElement => {
      if (!glitchVoice.current) {
        glitchVoice.current = new Audio('/media/glitch.mp3')
        glitchVoice.current.preload = 'auto'
      }
      return glitchVoice.current
    }
    const burst = (delay: number, rate: number) => {
      glitchTimers.current.push(
        window.setTimeout(() => {
          const el = voice().cloneNode() as HTMLAudioElement
          el.volume = 0.3
          el.playbackRate = rate
          void el.play().catch(() => undefined)
        }, delay),
      )
    }

    glitchTimers.current.push(window.setTimeout(() => setGlitching(true), 360))
    burst(360 + 70, 1)
    burst(360 + 690, 0.8)
    burst(360 + 1330, 1.22)
    glitchTimers.current.push(window.setTimeout(() => setGlitching(false), 360 + 2280))
    // só depois do glitch o robô sobe (com balão) e o diário começa a escrever
    glitchTimers.current.push(window.setTimeout(() => setArmed(true), 360 + 2380))
  }, [])

  const step = useCallback(
    (direction: number) => {
      const next = Math.min(sceneCount - 1, Math.max(0, index + direction))
      sheetRef.current?.goTo(next)
    },
    [index, sceneCount],
  )

  /** `/#slug` abre o diário; fechar limpa o hash (link direto partilhável). */
  const syncHash = useCallback(() => {
    const target = relic ? `#${relic.id}` : ''
    if (target) {
      if (window.location.hash !== target) window.history.replaceState(window.history.state, '', target)
      return
    }
    if (!window.location.hash) return
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }, [relic])

  const requestClose = useCallback(() => {
    if (closing.current) return
    const root = rootRef.current
    const sheetEl = root?.querySelector<HTMLElement>('.sheet')
    const scrim = root?.querySelector<HTMLElement>('[data-scrim]')
    if (!root || (!sheetEl && !scrim)) {
      close()
      return
    }
    closing.current = true
    const timeline = gsap.timeline({
      onComplete: () => {
        closing.current = false
        close()
      },
    })
    if (scrim) timeline.to(scrim, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
    if (sheetEl) {
      timeline.to(sheetEl, { opacity: 0, y: 24, scale: 0.975, filter: 'blur(8px)', duration: 0.42, ease: 'power3.in' }, 0)
    }
  }, [close])

  // abertura: timeline do scrim + moldura, foco e glitch
  useEffect(() => {
    if (!relic) {
      clearGlitch()
      setArmed(false)
      if (act === 'scene') void playSoundtrack()
      lastFocus.current?.focus?.()
      lastFocus.current = null
      // só limpa o hash se o diário estava realmente aberto: na primeira carga
      // o hash é a entrada (`/#slug`) e ainda vai ser lido
      if (wasOpen.current) syncHash()
      wasOpen.current = false
      return
    }

    wasOpen.current = true

    lastFocus.current = (document.activeElement as HTMLElement | null) ?? null
    setIndex(0)
    setLightbox(null)
    setArmed(false)
    setTyping(false)
    stopSoundtrack()
    clearGlitch()
    runGlitch()

    const root = rootRef.current
    const sheetEl = root?.querySelector<HTMLElement>('.sheet')
    const scrim = root?.querySelector<HTMLElement>('[data-scrim]')
    const timeline = gsap.timeline()
    if (scrim) timeline.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.62, ease: 'power2.out' }, 0)
    if (sheetEl) {
      timeline.fromTo(
        sheetEl,
        { opacity: 0, y: 76, scale: 0.92, filter: 'blur(22px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'power4.out' },
        0.04,
      )
    }
    const focusFrame = requestAnimationFrame(() => frameRef.current?.focusSelf())
    syncHash()

    return () => {
      cancelAnimationFrame(focusFrame)
      timeline.kill()
    }
  }, [relic, act, clearGlitch, runGlitch, syncHash])

  // link direto: `/#slug` na carga e em mudanças do hash
  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.replace(/^#/, '')
      if (!id) return
      if (relics.some((item) => item.id === id)) open(id)
    }
    window.addEventListener('hashchange', openFromHash)
    openFromHash()
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [relics, open])

  // teclado: Esc, setas e focus trap
  useEffect(() => {
    const focusables = (): HTMLElement[] => {
      const root = document.querySelector<HTMLElement>('[role="dialog"]')
      if (!root) return []
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
    }

    const onKey = (event: KeyboardEvent) => {
      if (!relic || lightbox) return
      if (event.key === 'Escape') {
        requestClose()
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        step(1)
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        step(-1)
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && (active === first || active === null || !items.includes(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || active === null || !items.includes(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [relic, lightbox, requestClose, step])

  useEffect(() => () => clearGlitch(), [clearGlitch])

  if (!mounted || !relic) return null

  return createPortal(
    <div ref={rootRef} data-modal>
      <SheetFrame
        ref={frameRef}
        overlay
        label={relic.name}
        progress={progress}
        glitch={glitching}
        onClose={requestClose}
      >
        <RelicSheet
          ref={sheetRef}
          relic={relic}
          index={index}
          armed={armed}
          onIndexChange={setIndex}
          onOpenMedia={setLightbox}
          onTyping={setTyping}
        />
      </SheetFrame>
      {armed ? <BotNarrator talking={typing} /> : null}
      {lightbox ? <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>,
    document.body,
  )
}
