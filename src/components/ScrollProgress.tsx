'use client'

import { useEffect, useRef } from 'react'

export function ScrollProgress() {
  const fill = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let frame = 0

    const update = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (fill.current) fill.current.style.transform = `scaleX(${0.0005 + progress * 0.9995})`
      frame = 0
    }

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="fr-progress fr" aria-hidden="true">
      <div ref={fill} className="fr-progress__fill" />
    </div>
  )
}
