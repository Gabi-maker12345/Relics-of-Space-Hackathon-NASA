'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getGlEngine } from '@/lib/gl'
import { useProjectModal } from '@/hooks/useProjectModal'
import { useRelics } from '@/hooks/useRelics'

interface CardItem {
  id: string
  copy: number
  name: string
  tagline: string
  ratio: string
  poster: string
}

const DESKTOP_QUERY = 650

export function FeaturedCarousel() {
  const { relics } = useRelics()
  const { open } = useProjectModal()
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [copies, setCopies] = useState(1)

  const cards = useMemo<CardItem[]>(
    () =>
      Array.from({ length: copies }, (_, copy) =>
        relics.map(relic => ({
          id: relic.id,
          copy,
          name: relic.name,
          tagline: relic.tagline,
          ratio: relic.ratio,
          poster: relic.coverPoster ?? relic.image,
        })),
      ).flat(),
    [copies, relics],
  )

  useEffect(() => {
    const el = trackRef.current
    if (el !== null) {
      const engine = getGlEngine()
      engine.attachTrack(el)
    }
    const updateCopies = (): void => {
      setCopies(window.innerWidth >= DESKTOP_QUERY ? 3 : 1)
    }
    updateCopies()
    window.addEventListener('resize', updateCopies)
    return () => window.removeEventListener('resize', updateCopies)
  }, [])

  // equivalente ao watch(copies) + nextTick: o DOM das cópias já está montado
  useEffect(() => {
    getGlEngine().resetCarousel()
  }, [copies])

  function openRelic(id: string): void {
    // arrastar o carrossel não deve abrir a relíquia
    if (getGlEngine().dragDistance() > 6) return
    open(id)
  }

  return (
    <div
      ref={trackRef}
      data-carousel=""
      data-infinite=""
      data-copies={copies}
      className="absolute w-full left-0 top-0 s:top-1/2 flex flex-col s:flex-row s:-translate-y-1/2 gap-y-20 s:gap-x-10 px-20 s:px-0"
    >
      {cards.map(card => (
        <article
          key={`${card.id}-${card.copy}`}
          className="relative w-full s:h-[43.5svh] s:max-h-[55rem] s:w-auto flex-none cursor-pointer rounded-15 s:rounded-20"
          style={{ aspectRatio: card.ratio }}
          data-id={card.id}
          data-gl="card"
          data-texture={card.poster}
          aria-hidden={card.copy === 1 || copies === 1 ? undefined : 'true'}
          onClick={() => openRelic(card.id)}
        >
          <p className="pointer-events-none absolute bottom-10 inset-x-10 s:bottom-10 s:inset-x-20 flex items-end justify-between">
            <span className="relative block min-w-0 flex-1 mr-10">
              <span
                className="block whitespace-nowrap text-16 s:text-18 tracking-[-0.05em] [-webkit-text-fill-color:transparent]"
                data-title=""
                data-gl="text"
              >{card.name}</span>
              <span
                data-gl="text"
                aria-hidden="true"
                className="mt-4 block whitespace-normal line-clamp-2 text-14 s:text-16 leading-14 tracking-[-0.05em] text-white/25 max-w-[30rem] overflow-hidden [-webkit-text-fill-color:transparent]"
              >{card.tagline}</span>
            </span>
            <span
              data-gl="pill"
              data-arrow=""
              className="invisible relative inline-flex size-25 s:size-25 items-center justify-center rounded-full bg-black text-white"
              aria-hidden="true"
            ><span className="visible absolute inset-0 rounded-[inherit] pointer-events-auto"></span></span>
          </p>
        </article>
      ))}
    </div>
  )
}
