'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { RelicCover } from '@/components/RelicCover'
import { StatusBadge } from '@/components/StatusBadge'
import { useRelics } from '@/hooks/useRelics'
import { isPublished, LOCATION_LABEL, relicLocation, relicStatus } from '@/utils/relics'

export function RelicPanels() {
  const { relics } = useRelics()
  const visible = useMemo(() => relics.filter(isPublished), [relics])

  const wrap = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(0)
  const [scrolled, setScrolled] = useState(0)
  const [viewportH, setViewportH] = useState(900)

  const total = visible.length

  useEffect(() => {
    if (total === 0) return
    let frame = 0

    const measure = () => {
      frame = 0
      const el = wrap.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      const nextScrolled = Math.max(0, -rect.top)
      setScrolled(nextScrolled)
      setViewportH(window.innerHeight)
      setProgress(span > 0 ? Math.min(1, Math.max(0, nextScrolled / span)) : 0)
      // o passo ativo é o que está mais próximo do centro do viewport
      const next = Math.min(total - 1, Math.max(0, Math.floor((nextScrolled + window.innerHeight / 2) / window.innerHeight)))
      setActive((current) => (next !== current ? next : current))
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
  }, [total])

  const mediaStyle = useMemo<CSSProperties>(
    () => ({
      transform: `scale(${(1.015 + progress * 0.05).toFixed(4)})`,
    }),
    [progress],
  )

  /**
   * Quadrado a abrir (como no original): o cartão do passo seguinte nasce
   * fechado (`inset(50%)`) e abre até `inset(0)` ao longo do passo anterior.
   * O valor é scrubado pelo scroll — nada de transição de duração fixa.
   */
  const cardInset = (index: number) => {
    if (index === 0) return 0
    const local = (scrolled - (index - 1) * viewportH) / viewportH
    return Math.max(0, Math.min(50, 50 * (1 - local)))
  }

  if (total === 0) {
    return (
      <div className="fr-panels fr-panels--empty">
        <p className="fr-label">Arquivo vazio</p>
        <p className="fr-panels__emptyTitle">Ainda não há relíquias publicadas.</p>
      </div>
    )
  }

  return (
    <div ref={wrap} className="fr-panels" style={{ height: `${Math.max(1, total) * 100}vh` }}>
      <aside className="fr-panels__media" aria-hidden="true">
        <div className="fr-panels__mediaInner" style={mediaStyle}>
          {visible.map((relic, index) => (
            <div key={`bg-${relic.id}`} className={`fr-panels__layer${index === active ? ' is-active' : ''}`}>
              <RelicCover src={relic.image} poster={relic.coverPoster} alt="" autoplay={index === active} />
            </div>
          ))}
          <div className="fr-panels__veil" />
        </div>
      </aside>

      <div className="fr-panels__grid">
        <aside className="fr-panels__cards" aria-hidden="true">
          <div className="fr-panels__cardsInner">
            {visible.map((relic, index) => (
              <figure
                key={`card-${relic.id}`}
                className="fr-panels__card"
                style={{ zIndex: index + 1, clipPath: `inset(${cardInset(index).toFixed(2)}%)` }}
              >
                <RelicCover src={relic.image} poster={relic.coverPoster} alt="" autoplay={index === active} />
              </figure>
            ))}
          </div>
        </aside>

        <div className="fr-panels__copy">
          {visible.map((relic, index) => (
            <article
              key={relic.id}
              className={`fr-step${index === active ? ' is-active' : ''}`}
              aria-current={index === active ? 'true' : undefined}
              aria-labelledby={`relic-${relic.id}`}
            >
              <p className="fr-label fr-step__counter">
                {`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`}
                <span className="fr-step__meta">
                  {LOCATION_LABEL[relicLocation(relic)]}
                  <StatusBadge status={relicStatus(relic)} />
                </span>
              </p>
              <h3 id={`relic-${relic.id}`} className="fr-serif fr-step__title">
                {relic.name}
              </h3>
              <p className="fr-label fr-step__mission">{relic.mission}</p>
              <p className="fr-body fr-step__body">{relic.body}</p>
              <dl className="fr-facts fr-step__facts">
                {relic.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
