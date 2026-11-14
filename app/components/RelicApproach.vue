<script setup lang="ts">
import { isPublished } from '~/utils/relics'

const { t } = useI18n()
const { relics, load } = useRelics()

onMounted(() => { void load() })

/** Todas as relíquias publicadas ficam na órbita (12 no arquivo atual). */
const orbitItems = computed(() => relics.value.filter(isPublished))

const sectionEl = ref<HTMLElement | null>(null)
const orbitEl = ref<HTMLElement | null>(null)
const items = ref<HTMLElement[]>([])
const setItem = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el instanceof HTMLElement) items.value[index] = el
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/* Constantes do Orbit Images original (ellipse, depth .5, volta de 40 s). */
const LAP_SECONDS = 42
const DEPTH = 0.5
/* Revelação pelo scroll: cada capa acende numa janela própria. */
const REVEAL_START = 0.08
const REVEAL_SPAN = 0.6
const REVEAL_DURATION = 0.16

let raf = 0
let last = 0
let phase = -Math.PI / 2
let velocity = 0
let reduced = false
let visible = false
let dragging = false
let lastX = 0
let lastT = 0
let width = 0
let height = 0
const rx = ref(0)
const ry = ref(0)
const pathOpacity = ref(0)
let observer: IntersectionObserver | null = null
let resize: ResizeObserver | null = null

/**
 * As capas são distribuídas por comprimento de arco (como no Orbit Images, que
 * amostra o path). Em ângulo, a elipse junta as capas nos extremos do eixo
 * maior e elas sobrepunham-se.
 */
const ARC_STEPS = 720
const arcLengths = new Float32Array(ARC_STEPS + 1)
let arcPerimeter = 1

function buildArc(): void {
  const a = Math.max(1, rx.value)
  const b = Math.max(1, ry.value)
  const step = (Math.PI * 2) / ARC_STEPS
  let total = 0
  let previousX = a
  let previousY = 0
  arcLengths[0] = 0
  for (let index = 1; index <= ARC_STEPS; index += 1) {
    const angle = index * step
    const x = a * Math.cos(angle)
    const y = b * Math.sin(angle)
    total += Math.hypot(x - previousX, y - previousY)
    arcLengths[index] = total
    previousX = x
    previousY = y
  }
  arcPerimeter = total || 1
}

function angleAtU(u: number): number {
  const target = (((u % 1) + 1) % 1) * arcPerimeter
  let low = 0
  let high = ARC_STEPS
  while (low < high) {
    const mid = (low + high) >> 1
    if ((arcLengths[mid] ?? 0) < target) low = mid + 1
    else high = mid
  }
  const index = Math.max(1, low)
  const from = arcLengths[index - 1] ?? 0
  const to = arcLengths[index] ?? from
  const fraction = to > from ? (target - from) / (to - from) : 0
  return ((index - 1 + fraction) * (Math.PI * 2)) / ARC_STEPS
}

function measure(): void {
  const el = orbitEl.value
  if (!el) return
  width = el.clientWidth
  height = el.clientHeight
  rx.value = width * 0.42
  ry.value = height * 0.3
  buildArc()
}

/** 0 no topo da secção, 1 quando a última das 140vh de scroll passou. */
function scrollProgress(): number {
  const el = sectionEl.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const span = rect.height - window.innerHeight
  return span > 0 ? clamp(-rect.top / span, 0, 1) : 0
}

function render(now: number): void {
  raf = 0
  const count = Math.min(items.value.length, orbitItems.value.length)
  if (!count || !width || !height) return

  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
  last = now

  if (!reduced && !dragging) {
    phase += ((Math.PI * 2) / LAP_SECONDS + velocity) * dt
    velocity *= Math.exp(-dt * 1.6)
  }

  const progress = scrollProgress()
  const radiusX = rx.value
  const radiusY = ry.value
  const phaseU = phase / (Math.PI * 2)
  const step = count > 1 ? REVEAL_SPAN / (count - 1) : 0

  for (let index = 0; index < count; index += 1) {
    const node = items.value[index]
    if (!node) continue
    const angle = angleAtU(phaseU + index / count)
    const x = Math.cos(angle) * radiusX
    const y = Math.sin(angle) * radiusY
    const front = (Math.sin(angle) + 1) / 2
    const start = REVEAL_START + step * index
    const local = smoothstep(start, start + REVEAL_DURATION, progress)
    const depthScale = 1 + DEPTH * (0.3 * front - 0.45 * (1 - front))
    const scale = depthScale * (reduced ? 1 : 0.62 + 0.38 * local)
    const opacity = (1 - DEPTH * 0.55 * (1 - front)) * local

    node.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(3)})`
    node.style.opacity = opacity.toFixed(3)
    node.style.zIndex = String(Math.round(front * 100))
    node.style.filter = !reduced && local < 1 ? `blur(${((1 - local) * 7).toFixed(2)}px)` : 'none'
  }

  const line = smoothstep(0.02, 0.28, progress)
  if (Math.abs(line - pathOpacity.value) > 0.002) pathOpacity.value = line

  if (visible) raf = requestAnimationFrame(render)
}

function wake(): void {
  if (raf || !visible) return
  last = 0
  raf = requestAnimationFrame(render)
}

/** Arrastar gira a órbita; a velocidade extra morre na inércia. */
function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (reduced || orbitItems.value.length < 2) return
  dragging = true
  velocity = 0
  lastX = event.clientX
  lastT = performance.now()
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  wake()
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging) return
  const dx = event.clientX - lastX
  if (dx === 0) return
  lastX = event.clientX
  const now = performance.now()
  const dt = Math.max(1, now - lastT) / 1000
  lastT = now
  phase += dx * 0.006
  velocity = clamp((dx * 0.006) / dt, -6, 6)
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging) return
  dragging = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}

watch(orbitItems, () => {
  measure()
  wake()
}, { flush: 'post' })

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  measure()

  if (typeof ResizeObserver !== 'undefined') {
    resize = new ResizeObserver(() => {
      measure()
      wake()
    })
    if (orbitEl.value) resize.observe(orbitEl.value)
  }

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver((entries) => {
      visible = entries.some(entry => entry.isIntersecting)
      if (visible) wake()
    }, { threshold: 0.15 })
    if (orbitEl.value) observer.observe(orbitEl.value)
  }
  else {
    visible = true
    wake()
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  resize?.disconnect()
})
</script>

<template>
  <section id="relics" ref="sectionEl" class="fr-approach" aria-labelledby="relics-approach-title">
    <div class="fr-approach__stage">
      <div
        ref="orbitEl"
        class="fr-orbit"
        :class="{ 'is-dragging': dragging }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <span
          class="fr-orbit__path"
          aria-hidden="true"
          :style="{ width: `${rx * 2}px`, height: `${ry * 2}px`, opacity: pathOpacity }"
        />

        <figure
          v-for="(relic, index) in orbitItems"
          :key="relic.id"
          :ref="el => setItem(el, index)"
          class="fr-orbit__item"
          aria-hidden="true"
        >
          <img :src="relic.image" alt="" draggable="false" decoding="async" />
        </figure>

        <header class="fr-approach__head">
          <h2 id="relics-approach-title" class="fr-serif fr-approach__title">{{ t('approach.title') }}</h2>
        </header>
      </div>

      <p class="fr-approach__note">
        Entre 1969 e 1982, a humanidade deixou na Lua e em Marte máquinas que continuam exactamente onde pararam.
      </p>
    </div>
  </section>
</template>
