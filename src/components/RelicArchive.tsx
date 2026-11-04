'use client'

import { useEffect, useRef } from 'react'
import { ForgeCta } from '@/components/ForgeCta'
import { useAct } from '@/hooks/useAct'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function RelicArchive() {
  const section = useRef<HTMLElement | null>(null)
  const elements = useRef<(HTMLElement | null)[]>([])
  const { open } = useAct()

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const el = section.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      const p = span > 0 ? clamp01(-rect.top / span) : 0

      elements.current.forEach((node, index) => {
        if (!node) return
        const offset = index * 0.09
        const local = reduced ? 1 : clamp01((p - offset) / 0.45)
        const depth = (1 - local) * -1100
        const scale = 0.55 + local * 0.45
        node.style.transform = `translateZ(${depth.toFixed(1)}px) scale(${scale.toFixed(3)})`
        node.style.opacity = (reduced ? 1 : local).toFixed(3)
        node.style.filter = local < 1 ? `blur(${((1 - local) * 16).toFixed(1)}px)` : 'none'
        if (local > 0.9 && node.dataset.born !== '1') {
          node.dataset.born = '1'
          node.classList.add('is-born')
        }
      })
    }

    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [])

  /** Abre o segundo acto (cosmos → cena 3D). */
  const startFlip = () => open()

  return (
    <section ref={section} className="fr-archive" aria-labelledby="archive-title">
      <div className="fr-archive__stage">
        <div className="fr-archive__plane">
          <p
            ref={(el) => {
              elements.current[0] = el
            }}
            className="fr-label fr-archive__eyebrow"
          >
            Arquivo de missões
          </p>
          <h2
            id="archive-title"
            ref={(el) => {
              elements.current[1] = el
            }}
            className="fr-serif fr-archive__title"
          >
            O que ficou
            <br />
            para trás
          </h2>
          <p
            ref={(el) => {
              elements.current[2] = el
            }}
            className="fr-archive__body"
          >
            Três relíquias, três histórias. A mesma pergunta: o que acontece com aquilo que deixamos de usar?
          </p>
          <div
            ref={(el) => {
              elements.current[3] = el
            }}
            className="fr-archive__action"
          >
            <ForgeCta label="Ver o arquivo" onClick={startFlip} />
          </div>
        </div>
      </div>
    </section>
  )
}
