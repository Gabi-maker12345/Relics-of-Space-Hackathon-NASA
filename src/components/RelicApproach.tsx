'use client'

import { useEffect, useRef } from 'react'
import { missionMarquee } from '@/data/relics'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Formas: círculo → estrela (raios alternados) → dois anéis contrarrotativos.
 */
const shapeFactor = (index: number, starMix: number, ellipseMix: number) => {
  const star = index % 2 === 0 ? 1 : 0.46
  // a estrela desfaz-se enquanto o anel se estica numa elipse
  return 1 + (star - 1) * starMix * (1 - ellipseMix)
}

const names = missionMarquee

export function RelicApproach() {
  const wrap = useRef<HTMLElement | null>(null)
  const title = useRef<HTMLHeadingElement | null>(null)
  const linePath = useRef<SVGPathElement | null>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = names.length
    let raf = 0

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const el = wrap.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      const p = span > 0 ? clamp01(-rect.top / span) : 0

      const starMix = smoothstep(0.66, 0.8, p)
      const infMix = smoothstep(0.82, 0.95, p)
      const radius = Math.min(window.innerWidth, window.innerHeight) * (window.innerWidth < 650 ? 0.4 : 0.33)
      const shapeMix = Math.max(starMix, infMix)
      // as formas ficam mais legíveis com a rotação mais lenta
      let rotation = reduced ? 0 : (now / 1000) * 0.09 * (1 - shapeMix) + p * 1.1
      if (!reduced && shapeMix > 0.001) {
        // alinha o padrão a um passo da grelha para a estrela nascer "direita"
        const step = (Math.PI * 2) / total
        const anchor = -Math.PI / 2
        const snapped = Math.round((rotation - anchor) / step) * step + anchor
        rotation += (snapped - rotation) * shapeMix
      }

      // o título sai de cena quando o anel se fecha — liberta o centro para as formas
      if (title.current) {
        const out = smoothstep(0.3, 0.5, p)
        title.current.style.opacity = (1 - out).toFixed(3)
        title.current.style.transform = `scale(${(1 + out * 0.12).toFixed(3)})`
        title.current.style.filter = out > 0.02 ? `blur(${(out * 8).toFixed(1)}px)` : 'none'
      }

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      let d = ''

      for (let i = 0; i < total; i += 1) {
        const node = items.current[i]
        if (!node) continue
        const angle = (i / total) * Math.PI * 2 + rotation
        const shape = shapeFactor(i, starMix, infMix)
        const squash = 1 + (0.58 - 1) * infMix
        const x = Math.cos(angle) * radius * shape
        const y = Math.sin(angle) * radius * shape * squash
        d += `${i === 0 ? 'M' : 'L'}${(cx + x).toFixed(1)} ${(cy + y).toFixed(1)}`

        const start = reduced ? 0 : 0.14 + i * 0.028
        const opacity = reduced ? 1 : clamp01((p - start) / 0.035)

        const scale = (0.86 + opacity * 0.14) * (1 - 0.2 * shapeMix)
        node.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`
        node.style.opacity = opacity.toFixed(3)
        node.style.filter = opacity < 1 ? `blur(${((1 - opacity) * 6).toFixed(1)}px)` : 'none'

        if (opacity > 0.55 && node.dataset.lit !== '1') {
          node.dataset.lit = '1'
          node.classList.add('is-lit')
        }
      }

      if (linePath.current) {
        linePath.current.setAttribute('d', `${d}Z`)
        linePath.current.style.opacity = (0.1 + 0.34 * starMix + 0.06 * smoothstep(0.1, 0.5, p)).toFixed(3)
      }
    }

    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section ref={wrap} className="fr-approach" aria-labelledby="relics-approach-title">
      <div className="fr-approach__stage">
        <header className="fr-approach__head">
          <h2 id="relics-approach-title" ref={title} className="fr-serif fr-approach__title">
            As relíquias
          </h2>
        </header>

        <svg className="fr-orbit__lines" aria-hidden="true">
          <path ref={linePath} d="" />
        </svg>

        <ul className="fr-orbit" aria-label="Missões do arquivo">
          {names.map((name, index) => (
            <li
              key={name}
              ref={(el) => {
                items.current[index] = el
              }}
              className="fr-orbit__item"
            >
              <span className="fr-orbit__label">{name}</span>
              <span className="fr-orbit__spark" aria-hidden="true">
                ✦
              </span>
            </li>
          ))}
        </ul>

        <p className="fr-approach__note">
          Entre 1969 e 1982, a humanidade deixou na Lua e em Marte máquinas que continuam exactamente onde pararam.
        </p>
      </div>
    </section>
  )
}
