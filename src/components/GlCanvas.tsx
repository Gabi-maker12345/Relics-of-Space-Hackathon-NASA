'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getGlEngine } from '@/lib/gl'

function attachNextFrame(): void {
  const engine = getGlEngine()
  engine.defer(0, () => {
    engine.scan()
    const track = document.querySelector<HTMLElement>('[data-carousel]')
    if (track !== null) engine.attachTrack(track)
  })
}

export function GlCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pathname = usePathname()
  const firstPath = useRef(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = getGlEngine()
    let cancelled = false

    void engine.init(canvas).then(() => {
      if (cancelled) return
      attachNextFrame()
    })

    if (process.env.NODE_ENV !== 'production') {
      ;(window as unknown as Record<string, unknown>).__gl = engine
    }

    return () => {
      cancelled = true
      getGlEngine().dispose()
    }
  }, [])

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    attachNextFrame()
  }, [pathname])

  return (
    <div className="gl">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
