'use client'

import { useEffect, useRef, useState } from 'react'
import { getGlEngine } from '@/lib/gl'

export function BootLoader() {
  const [show, setShow] = useState(true)
  const fadeRef = useRef<HTMLDivElement | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const engine = getGlEngine()
    void engine.booted.then(async () => {
      const el = fadeRef.current
      if (el) el.style.opacity = '0'
      await engine.exitBars()
      engine.enterAll()
      setShow(false)
    })
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-99">
      <div ref={fadeRef} className="absolute inset-0 bg-black transition-opacity duration-[350ms] ease-out" />
      <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
        <div className="flex gap-x-8">
          {[1, 2, 3].map((index) => (
            <div key={index} data-gl="bar" className="h-5 w-50 rounded-[2rem]" />
          ))}
        </div>
      </div>
    </div>
  )
}
