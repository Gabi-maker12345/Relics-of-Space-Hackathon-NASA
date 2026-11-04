'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { heroCopy } from '@/data/relics'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function RelicHero() {
  const section = useRef<HTMLElement | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const el = section.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      setProgress(span > 0 ? clamp01(-rect.top / span) : 0)
    }

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const phase = useMemo(() => {
    const out = clamp01(progress / 0.42)
    const inn = clamp01((progress - 0.34) / 0.24)
    return { out, inn }
  }, [progress])

  const firstStyle = useMemo<CSSProperties>(
    () => ({
      opacity: String(1 - phase.out),
      transform: `translateY(${-phase.out * 48}px) scale(${1 - phase.out * 0.03})`,
      filter: `blur(${phase.out * 8}px)`,
    }),
    [phase.out],
  )

  const secondStyle = useMemo<CSSProperties>(
    () => ({
      opacity: String(phase.inn),
      transform: `translateY(${(1 - phase.inn) * 34}px) scale(${0.97 + phase.inn * 0.03})`,
      filter: `blur(${(1 - phase.inn) * 8}px)`,
    }),
    [phase.inn],
  )

  return (
    <section ref={section} className="fr-hero" aria-label="Space Relics">
      <div className="fr-hero__sticky">
        <div className="fr-hero__layer" style={firstStyle}>
          <h1 className="fr-serif fr-hero__title">{heroCopy.title}</h1>
          <p className="fr-hero__deck">{heroCopy.deck}</p>
        </div>

        <div className="fr-hero__layer" style={secondStyle} aria-hidden="false">
          <h2 className="fr-serif fr-hero__title">
            Abandonados,
            <em>mas não esquecidos.</em>
          </h2>
          <p className="fr-hero__deck">{heroCopy.phaseTwoDeck}</p>
        </div>

        <div className="fr-hero__dots" aria-hidden="true">
          <span className={progress < 0.45 ? 'is-on' : undefined} />
          <span className={progress >= 0.45 ? 'is-on' : undefined} />
        </div>
      </div>
    </section>
  )
}
