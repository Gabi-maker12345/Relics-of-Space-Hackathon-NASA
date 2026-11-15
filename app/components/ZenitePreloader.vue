<script setup lang="ts">
import gsap from 'gsap'
import logoSvg from '~/assets/zenite/zenite-logo.svg?raw'
import { setSmoothScrollEnabled } from '~/composables/useSmoothScroll'

/**
 * Preloader da Zénite (spec: animação da logo, som sintetizado, voo para o
 * cabeçalho). Constantes de tempo/ease no topo para ajuste a olho.
 */
const T = {
  lettersStart: 0.3,
  letterDuration: 1.0,
  letterStagger: 0.16,
  letterRise: 28,
  arcsStart: 2.0,
  arcsDuration: 1.4,
  starStart: 3.0,
  starScale: 1.3,
  starOpacity: 0.4,
  holdBeforeFlight: 0.6,
  flight: 1.6,
  bgFadeDelay: 0.3,
  bgFade: 1.1,
  contentFade: 0.5,
  contentStagger: 0.08,
  shortFlight: 1.0,
  reducedFade: 0.4,
} as const

const EASE = {
  letters: 'power3.out',
  arcs: 'power2.inOut',
  starScale: 'back.out(1.7)',
  starRotation: 'power3.out',
  flight: 'power3.inOut',
} as const

/** Marca que a intro já correu nesta sessão (a partir daí, versão curta). */
const SESSION_KEY = 'zenite:preloader:v1'
/** Se o motor falhar, o conteúdo não pode ficar escondido para sempre. */
const SAFETY_MS = 9000

const { t } = useI18n()
const route = useRoute()

const rootRef = ref<HTMLElement | null>(null)
const bgRef = ref<HTMLElement | null>(null)
const logoBoxRef = ref<HTMLElement | null>(null)
const hidden = ref(false)

let timeline: gsap.core.Timeline | null = null
let flightTween: gsap.core.Tween | null = null
let safetyTimer = 0

const svgEl = (): SVGSVGElement | null => logoBoxRef.value?.querySelector('svg') ?? null
const slotEl = (): HTMLElement | null => document.getElementById('logo-slot')

/* ————— som "plin" (Web Audio, sintetizado) ————— */

let audioContext: AudioContext | null = null

function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioContext = new Ctor()
  }
  return audioContext
}

/** Autoplay: o contexto só existe depois do gesto; nunca tocamos atrasado. */
function unlockAudio(): void {
  const context = ensureAudio()
  if (context && context.state !== 'running') void context.resume().catch(() => undefined)
}

function playPlin(): void {
  const context = audioContext
  if (!context || context.state !== 'running') return

  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.2, now + 0.004)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.8)

  const partials: Array<[number, number, number]> = [
    [1318.5, 1, 1.8],
    [2637, 0.35, 1.2],
    [3968.6, 0.15, 0.8],
  ]
  for (const [frequency, gain, decay] of partials) {
    const osc = context.createOscillator()
    const envelope = context.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.004)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + decay)
    osc.connect(envelope).connect(master)
    osc.start(now)
    osc.stop(now + decay + 0.05)
  }

  const delay = context.createDelay(0.5)
  delay.delayTime.value = 0.22
  const feedback = context.createGain()
  feedback.gain.value = 0.28
  const lowpass = context.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 6000
  const mix = context.createGain()
  mix.gain.value = 0.25

  master.connect(context.destination)
  master.connect(delay)
  delay.connect(lowpass).connect(feedback).connect(delay)
  delay.connect(mix).connect(context.destination)
}

/* ————— medição do voo ————— */

function flightVars(): { x: number; y: number; scale: number } {
  const svg = svgEl()
  const slot = slotEl()
  if (!svg || !slot) return { x: 0, y: 0, scale: 1 }
  const from = svg.getBoundingClientRect()
  const to = slot.getBoundingClientRect()
  return {
    x: to.left - from.left,
    y: to.top - from.top,
    scale: to.width > 0 && from.width > 0 ? to.width / from.width : 1,
  }
}

/* ————— ciclo ————— */

function setPageLocked(locked: boolean): void {
  const main = document.querySelector<HTMLElement>('.site__main')
  const header = document.querySelector<HTMLElement>('.fr-header')
  if (locked) {
    document.documentElement.setAttribute('data-preloading', '')
    main?.setAttribute('inert', '')
    header?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    setSmoothScrollEnabled(false)
    return
  }
  document.documentElement.removeAttribute('data-preloading')
  main?.removeAttribute('inert')
  header?.removeAttribute('inert')
  document.body.style.overflow = ''
  setSmoothScrollEnabled(true)
}

/** Põe a logo no slot do cabeçalho e limpa o overlay (a troca é invisível). */
function settle(): void {
  const svg = svgEl()
  const slot = slotEl()
  if (svg && slot) {
    gsap.set(svg, { clearProps: 'all' })
    slot.appendChild(svg)
    svg.classList.add('zenite-logo--header')
    const fallback = slot.querySelector<HTMLElement>('img')
    if (fallback) fallback.style.display = 'none'
  }
  setPageLocked(false)
  document.documentElement.setAttribute('data-preload-done', '')
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  }
  catch {
    /* storage indisponível */
  }
  window.clearTimeout(safetyTimer)
  hidden.value = true
}

function fadeOutAndSettle(duration: number): void {
  const root = rootRef.value
  if (!root) {
    settle()
    return
  }
  gsap.to(root, { opacity: 0, duration, onComplete: settle })
}

/** A página pronta para receber a logo no cabeçalho (fontes + load). */
function pageReady(): Promise<void> {
  const tasks: Array<Promise<unknown>> = []
  if (document.fonts?.ready) tasks.push(document.fonts.ready)
  if (document.readyState !== 'complete') {
    tasks.push(new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true })))
  }
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 4000))
  return Promise.race([Promise.all(tasks), timeout]).then(() => undefined)
}

function runShort(): void {
  const svg = svgEl()
  const bg = bgRef.value
  if (!svg) {
    fadeOutAndSettle(T.reducedFade)
    return
  }
  gsap.set(['#wordmark', '#letter-1-z', '#letter-2-e-acento', '#letter-3-n', '#letter-4-i', '#letter-5-t', '#letter-6-e'], { opacity: 1, y: 0 })
  gsap.set(['#reveal-arc-left', '#reveal-arc-right'], { strokeDasharray: 1, strokeDashoffset: 0 })
  gsap.set('#star', { scale: 1, rotation: 0, opacity: 1, transformOrigin: '50% 50%' })

  const tl = gsap.timeline({ onComplete: settle })
  tl.to(svg, {
    x: () => flightVars().x,
    y: () => flightVars().y,
    scale: () => flightVars().scale,
    transformOrigin: '0 0',
    duration: T.shortFlight,
    ease: EASE.flight,
  }, 0)
  if (bg) tl.to(bg, { opacity: 0, duration: 0.7 }, 0.2)
  timeline = tl
}

function runReduced(): void {
  const svg = svgEl()
  if (!svg) {
    fadeOutAndSettle(T.reducedFade)
    return
  }
  gsap.set(['#letter-1-z', '#letter-2-e-acento', '#letter-3-n', '#letter-4-i', '#letter-5-t', '#letter-6-e'], { opacity: 1, y: 0 })
  gsap.set(['#reveal-arc-left', '#reveal-arc-right'], { strokeDasharray: 1, strokeDashoffset: 0 })
  gsap.set('#star', { scale: 1, rotation: 0, opacity: 1, transformOrigin: '50% 50%' })
  fadeOutAndSettle(T.reducedFade)
}

function runFull(): void {
  const svg = svgEl()
  if (!svg) {
    fadeOutAndSettle(T.reducedFade)
    return
  }
  const letters = ['#letter-1-z', '#letter-2-e-acento', '#letter-3-n', '#letter-4-i', '#letter-5-t', '#letter-6-e']
  const guides = ['#reveal-arc-left', '#reveal-arc-right']
  const star = '#star'
  const bg = bgRef.value
  const content = Array.from(document.querySelectorAll<HTMLElement>('.site__main > *'))

  gsap.set(guides, { strokeDasharray: 1, strokeDashoffset: 1 })
  gsap.set(star, { scale: 0, rotation: -60, opacity: 0, transformOrigin: '50% 50%' })
  gsap.set(content, { opacity: 0, y: 12 })

  const flightAt = T.starStart + T.starScale + T.holdBeforeFlight

  const tl = gsap.timeline({ onComplete: settle })
  timeline = tl

  tl.fromTo(
    letters,
    { opacity: 0, y: T.letterRise },
    { opacity: 1, y: 0, duration: T.letterDuration, ease: EASE.letters, stagger: T.letterStagger },
    T.lettersStart,
  )

  tl.to(guides, { strokeDashoffset: 0, duration: T.arcsDuration, ease: EASE.arcs }, T.arcsStart)

  tl.to(star, { scale: 1, duration: T.starScale, ease: EASE.starScale }, T.starStart)
  tl.to(star, { rotation: 0, duration: T.starScale, ease: EASE.starRotation }, T.starStart)
  tl.to(star, { opacity: 1, duration: T.starOpacity }, T.starStart)
  tl.call(playPlin, [], T.starStart)

  // espera a página real estar pronta antes de voar
  tl.addPause(flightAt, () => {
    void pageReady().then(() => tl.play())
  })

  // `isFlying` mantém o resize a recalcular o destino durante o voo
  flightTween = gsap.to(svg, {
    x: () => flightVars().x,
    y: () => flightVars().y,
    scale: () => flightVars().scale,
    transformOrigin: '0 0',
    duration: T.flight,
    ease: EASE.flight,
    paused: true,
    onStart: () => { isFlying = true },
    onComplete: () => { isFlying = false },
  })
  tl.add(flightTween, flightAt)

  if (bg) tl.to(bg, { opacity: 0, duration: T.bgFade }, flightAt + T.bgFadeDelay)
  if (content.length > 0) {
    tl.to(content, {
      opacity: 1,
      y: 0,
      duration: T.contentFade,
      stagger: T.contentStagger,
      ease: 'power2.out',
    }, flightAt + T.flight - T.contentFade)
  }

  tl.play(0)
}

let isFlying = false

function onResize(): void {
  if (!isFlying || !flightTween) return
  // funções de x/y/scale releem os rects; invalidate força o recálculo
  flightTween.invalidate()
}

onMounted(() => {
  if (route.path.startsWith('/admin')) {
    setPageLocked(false)
    hidden.value = true
    return
  }

  // o estado "js" já foi posto por script no <head>; aqui só tratamos do resto
  setPageLocked(true)
  ensureAudio()
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true })
  window.addEventListener('keydown', unlockAudio, { once: true })
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true })
  window.addEventListener('resize', onResize)

  safetyTimer = window.setTimeout(() => {
    if (!hidden.value) settle()
  }, SAFETY_MS)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let seen = false
  try {
    seen = sessionStorage.getItem(SESSION_KEY) === '1'
  }
  catch {
    seen = false
  }

  if (reduced) runReduced()
  else if (seen) runShort()
  else runFull()
})

onBeforeUnmount(() => {
  timeline?.kill()
  flightTween = null
  window.clearTimeout(safetyTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointerdown', unlockAudio)
  window.removeEventListener('keydown', unlockAudio)
  window.removeEventListener('touchstart', unlockAudio)
  setPageLocked(false)
})
</script>

<template>
  <div
    v-if="!hidden"
    ref="rootRef"
    class="preloader"
    role="status"
    :aria-label="t('loader.aria')"
    aria-live="polite"
  >
    <div ref="bgRef" class="preloader__bg" />
    <div class="preloader__stage">
      <!-- v-html: o SVG é movido para o cabeçalho no fim, fora da árvore Vue -->
      <div ref="logoBoxRef" class="preloader__logo" v-html="logoSvg" />
    </div>
  </div>
</template>

<style>
/* Estado inicial: sem JS a página aparece normalmente; com JS, o preloader
   assume o ecrã antes do primeiro paint (classe posta no <head>). */
.preloader {
  display: none;
}

html.js .preloader {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  background: transparent;
}

html.js[data-preload-done] .preloader {
  display: none;
}

html.js[data-preloading] .site__main,
html.js[data-preloading] .fr-header {
  opacity: 0;
}

.preloader__bg {
  position: absolute;
  inset: 0;
  background: #000;
}

.preloader__stage {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(280px, 42vw, 620px);
}

.preloader__logo {
  width: 100%;
  color: #fff;
  will-change: transform;
}

.preloader__logo svg,
.zenite-logo--header {
  display: block;
  width: 100%;
  height: auto;
}
</style>
