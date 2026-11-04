'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Relic, RelicScene } from '@/data/relics'
import { LOCATION_LABEL, relicLocation, relicStatus } from '@/utils/relics'
import { useSound } from '@/hooks/useSound'
import { duckSoundtrack } from '@/lib/soundtrack'
import { StatusBadge } from './StatusBadge'

export type RelicSheetHandle = {
  goTo: (index: number) => void
}

type RelicSheetProps = {
  relic: Relic
  index: number
  armed?: boolean
  onOpenMedia: (scene: RelicScene) => void
  onTyping: (active: boolean) => void
  onIndexChange?: (index: number) => void
  ref?: React.Ref<RelicSheetHandle>
}

type SwapPhase = 'idle' | 'leave' | 'enter'

export function RelicSheet({
  relic,
  index,
  armed = false,
  onOpenMedia,
  onTyping,
  onIndexChange,
  ref,
}: RelicSheetProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const { muted } = useSound()

  const scenes = relic.scenes
  const [shownIndex, setShownIndex] = useState(index)
  const [swapPhase, setSwapPhase] = useState<SwapPhase>('idle')
  const swapTimer = useRef(0)
  const swapFrame = useRef(0)

  const current = scenes[shownIndex] ?? scenes[0]
  const activeScene = scenes[index] ?? scenes[0]

  const onTypingRef = useRef(onTyping)
  useEffect(() => {
    onTypingRef.current = onTyping
  }, [onTyping])

  /** Executor de voz: um áudio por passo, nunca dois ao mesmo tempo. */
  const voiceRef = useRef<HTMLAudioElement | null>(null)

  const stopVoice = useCallback((): void => {
    const voice = voiceRef.current
    if (!voice) return
    voice.pause()
    voice.currentTime = 0
    duckSoundtrack(false)
  }, [])

  const playStepAudio = useCallback((): void => {
    const src = activeScene?.audio
    if (!src) {
      stopVoice()
      return
    }
    if (!voiceRef.current || voiceRef.current.dataset.src !== src) {
      stopVoice()
      const voice = new Audio(src)
      voice.preload = 'auto'
      voice.dataset.src = src
      voice.addEventListener('ended', () => duckSoundtrack(false))
      voiceRef.current = voice
    }
    if (muted) return
    const voice = voiceRef.current
    voice.volume = 0.9
    duckSoundtrack(true)
    void voice.play().catch(() => duckSoundtrack(false))
  }, [activeScene?.audio, muted, stopVoice])

  /** Pré-carrega o áudio do passo seguinte (metadata) para a troca ser imediata. */
  const preloadNext = useCallback((): void => {
    const next = scenes[index + 1]
    if (!next?.audio) return
    const warm = new Audio()
    warm.preload = 'metadata'
    warm.src = next.audio
  }, [scenes, index])

  const [typed, setTyped] = useState('')
  const [typing, setTyping] = useState(false)
  const typeTimer = useRef(0)

  const clearTyping = useCallback((): void => {
    window.clearTimeout(typeTimer.current)
    typeTimer.current = 0
  }, [])

  /** O diário escreve-se à frente do leitor (ritmo com pausas na pontuação). */
  const typeScene = useCallback(
    (delay = 220): void => {
      clearTyping()
      const text = activeScene?.body ?? ''
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setTyped('')
      if (reduced) {
        setTyped(text)
        setTyping(false)
        onTypingRef.current(false)
        return
      }
      setTyping(true)
      onTypingRef.current(true)
      let i = 0
      const tick = (): void => {
        i += 1
        setTyped(text.slice(0, i))
        if (i >= text.length) {
          setTyping(false)
          onTypingRef.current(false)
          typeTimer.current = 0
          return
        }
        const ch = text[i - 1] ?? ''
        const pause = /[.,;:!?—–]/.test(ch) ? 140 : ch === ' ' ? 24 : 9 + Math.random() * 15
        typeTimer.current = window.setTimeout(tick, pause)
      }
      typeTimer.current = window.setTimeout(tick, delay)
    },
    [activeScene?.body, clearTyping],
  )

  const resetTyping = useCallback((): void => {
    clearTyping()
    setTyped('')
    setTyping(false)
    onTypingRef.current(false)
  }, [clearTyping])

  const mutedReady = useRef(false)
  const armedRef = useRef(armed)
  useEffect(() => {
    armedRef.current = armed
  }, [armed])

  // troca de passo: voz do passo + pré-carga do seguinte
  useEffect(() => {
    playStepAudio()
    preloadNext()
  }, [index, scenes, playStepAudio, preloadNext])

  useEffect(() => {
    if (!mutedReady.current) {
      mutedReady.current = true
      return
    }
    if (muted) stopVoice()
    else playStepAudio()
  }, [muted, playStepAudio, stopVoice])

  // o texto só começa quando o glitch termina (o pai "arma" o diário)
  useEffect(() => {
    if (armed) {
      typeScene()
      playStepAudio()
      preloadNext()
    } else {
      resetTyping()
      stopVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed])

  useEffect(() => {
    if (armedRef.current) typeScene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // o vídeo só recebe `src` quando a cena fica ativa; aqui garantimos o play
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const nodes = el.querySelectorAll<HTMLElement>('.rsheet__scene')
    nodes.forEach((scene, i) => {
      const video = scene.querySelector('video')
      if (!video) return
      if (i === index) void video.play().catch(() => {})
      else video.pause()
    })
  }, [index, scenes])

  useEffect(
    () => () => {
      window.clearTimeout(typeTimer.current)
      stopVoice()
    },
    [stopVoice],
  )

  // transição out-in do bloco de texto (nome `swap` do Vue)
  useEffect(() => {
    if (index === shownIndex) return
    window.clearTimeout(swapTimer.current)
    setSwapPhase('leave')
    swapTimer.current = window.setTimeout(() => {
      setShownIndex(index)
      setSwapPhase('enter')
    }, 560)
    return () => window.clearTimeout(swapTimer.current)
  }, [index, shownIndex])

  useEffect(() => {
    if (swapPhase !== 'enter') return
    const first = requestAnimationFrame(() => {
      swapFrame.current = requestAnimationFrame(() => setSwapPhase('idle'))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(swapFrame.current)
    }
  }, [swapPhase])

  const swapClass =
    swapPhase === 'leave'
      ? 'swap-leave-active swap-leave-to'
      : swapPhase === 'enter'
        ? 'swap-enter-active swap-enter-from'
        : ''

  const goTo = (target: number): void => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: target * el.clientHeight, behavior: 'smooth' })
  }

  useImperativeHandle(ref, () => ({ goTo }), [])

  const onScroll = (): void => {
    const el = scrollerRef.current
    if (!el) return
    const next = Math.round(el.scrollTop / Math.max(1, el.clientHeight))
    const clamped = Math.min(scenes.length - 1, Math.max(0, next))
    if (clamped !== index) onIndexChange?.(clamped)
  }

  return (
    <div className="rsheet">
      <aside className="rsheet__info">
        <p className="rsheet__eyebrow" data-sheet-item>
          {relic.mission} · {LOCATION_LABEL[relicLocation(relic)]}
        </p>
        <h2 className="sheet__title" data-sheet-item>
          {relic.name}
        </h2>
        <p className="rsheet__state" data-sheet-item>
          <StatusBadge status={relicStatus(relic)} />
        </p>

        <div className="rsheet__copy" data-sheet-item>
          <div className={swapClass}>
            <p className="rsheet__kicker">{current.kicker}</p>
            <p className="rsheet__body" aria-label={current.body}>
              {typed}
              {typing ? <span className="rsheet__caret" aria-hidden="true" /> : null}
            </p>
          </div>
        </div>

        <dl className="rsheet__facts" data-sheet-item>
          {relic.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="rsheet__stage">
        <div ref={scrollerRef} className="rsheet__scroll" data-lenis-prevent onScroll={onScroll}>
          {scenes.map((scene, i) => (
            <section
              key={`${relic.id}-${i}`}
              className={`rsheet__scene${i === index ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className="rsheet__hit"
                aria-label={`Ver ${scene.kicker} em ecrã inteiro`}
                onClick={() => onOpenMedia(scene)}
              >
                {scene.kind === 'image' ? (
                  <img className="rsheet__media" src={scene.src} alt={relic.alt} decoding="async" />
                ) : (
                  <video
                    className="rsheet__media"
                    src={i === index ? scene.src : undefined}
                    poster={scene.poster}
                    muted
                    loop
                    playsInline
                    autoPlay
                    tabIndex={-1}
                  />
                )}
                <span className="rsheet__hint" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="13" height="13">
                    <path
                      d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </section>
          ))}
        </div>

        <div className="rsheet__rail" aria-hidden="true">
          {scenes.map((scene, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              className={`rsheet__dot${i === index ? ' is-on' : ''}`}
              tabIndex={-1}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
