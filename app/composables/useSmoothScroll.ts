import Lenis from 'lenis'

let instance: Lenis | null = null
let raf = 0

/** Instância única (client). `null` quando o utilizador pede menos movimento. */
export function getSmoothScroll(): Lenis | null {
  return instance
}

export function initSmoothScroll(): void {
  if (!import.meta.client || instance) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  instance = new Lenis({
    lerp: 0.072,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
    smoothWheel: true,
  })

  const loop = (time: number) => {
    instance?.raf(time)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
}

export function setSmoothScrollEnabled(enabled: boolean): void {
  if (!instance) return
  if (enabled) instance.start()
  else instance.stop()
}

export function scrollToElement(target: HTMLElement, offset = 0): void {
  if (instance) {
    instance.scrollTo(target, { offset, duration: 1.4 })
    return
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function destroySmoothScroll(): void {
  cancelAnimationFrame(raf)
  instance?.destroy()
  instance = null
}
