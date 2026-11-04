'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useAct } from '@/hooks/useAct'
import { FeaturedCarousel } from '@/components/FeaturedCarousel'

interface Star {
  id: number
  style: CSSProperties
}

const STARS: Star[] = Array.from({ length: 26 }, (_, i) => {
  const seed = (n: number): number => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  return {
    id: i,
    style: {
      left: `${(seed(1) * 100).toFixed(2)}%`,
      top: `${(seed(2) * 100).toFixed(2)}%`,
      width: `${(1 + seed(3) * 2.2).toFixed(2)}px`,
      height: `${(1 + seed(3) * 2.2).toFixed(2)}px`,
      animationDelay: `${(seed(4) * 3).toFixed(2)}s`,
      animationDuration: `${(2.2 + seed(5) * 2.6).toFixed(2)}s`,
    },
  }
})

export function CosmosGate() {
  const { act, back } = useAct()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className={`gate${act !== 'page' ? ' is-open' : ''}${act === 'scene' ? ' is-scene' : ''}`}>
      <div className="gate__veil" aria-hidden="true" />

      <div className="gate__stars" aria-hidden="true">
        {STARS.map(star => <span key={star.id} style={star.style} />)}
      </div>

      <div className="gate__stage">
        <div className="gate__glow" aria-hidden="true" />
        <p className="fr-label gate__eyebrow">Fim da transmissão</p>
        <h2 className="gate__title">
          <span className="gate__word gate__word--l">O cosmos</span>
          <span className="gate__word gate__word--r">continua.</span>
        </h2>
        <p className="gate__hint">Desça para atravessar</p>
      </div>

      <div className="gate__scene">
        {act === 'scene' ? <FeaturedCarousel /> : null}
      </div>

      {mounted && act !== 'page'
        ? createPortal(
            <div className="gate-chrome fr">
              {act === 'scene' ? <p className="fr-label gate__label">Relíquias</p> : null}
              <button type="button" className="gate__back" onClick={back}>
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
