'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  depth: number
  phase: number
  speed: number
  tint: string
  glow: boolean
}

export function CosmosBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const palette = ['#ffffff', '#dbe7ff', '#b9cdff', '#ffe9c9']
    let width = 0
    let height = 0
    let stars: Star[] = []
    let scrollY = 0
    let frame = 0

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const density = Math.round((width * height) / 9000)
      const count = Math.min(520, Math.max(180, density))
      stars = Array.from({ length: count }, () => {
        const depth = 0.25 + Math.random() * 0.75
        return {
          x: Math.random() * width,
          y: Math.random() * height * 2 - height * 0.5,
          r: 0.4 + depth * 1.5,
          depth,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.6,
          tint: palette[Math.floor(Math.random() * palette.length)],
          glow: Math.random() > 0.86,
        }
      })
    }

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw)
      context.clearRect(0, 0, width, height)
      // deriva lenta mas percetível: ~1,2 px/s no plano mais profundo
      const drift = reduced ? 0 : time / 11000
      const sway = reduced ? 0 : time / 13000
      for (const star of stars) {
        const parallax = (scrollY * 0.28 * star.depth) % (height * 1.5)
        let y = star.y - parallax + Math.sin(sway + star.phase) * 7 * star.depth
        if (y < -20) y += height * 1.5
        if (y > height + 20) y -= height * 1.5
        const x = (star.x + drift * star.depth * 42 + sway * 0) % width
        const twinkle = reduced ? 1 : 0.55 + 0.45 * Math.sin(time / (620 + star.speed * 380) + star.phase)
        const alpha = (0.16 + 0.74 * star.depth) * twinkle
        context.globalAlpha = alpha
        context.fillStyle = star.tint
        if (star.glow && !reduced) {
          context.shadowBlur = 10 * star.depth * twinkle
          context.shadowColor = star.tint
        }
        context.beginPath()
        context.arc(x, y, star.r, 0, Math.PI * 2)
        context.fill()
        if (star.glow && !reduced) context.shadowBlur = 0
      }
      context.globalAlpha = 1
    }

    const onScroll = () => {
      scrollY = window.scrollY
    }

    build()
    scrollY = window.scrollY
    draw(0)
    window.addEventListener('resize', build)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', build)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="cosmos" aria-hidden="true">
      <canvas ref={canvasRef} className="cosmos__canvas" />
      <div className="cosmos__nebula" />
    </div>
  )
}
