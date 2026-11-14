<script setup lang="ts">
import { isPublished } from '~/utils/relics'

const { t } = useI18n()
const { relics, load } = useRelics()

onMounted(() => { void load() })

/** Só seis capas: a órbita é um enquadramento, não o arquivo todo. */
const orbitItems = computed(() => relics.value.filter(isPublished).slice(0, 6))

const orbitEl = ref<HTMLElement | null>(null)
const items = ref<HTMLElement[]>([])
const setItem = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el instanceof HTMLElement) items.value[index] = el
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const easeOutQuint = (value: number) => 1 - Math.pow(1 - value, 5)

/* Constantes do Orbit Images original (ellipse, depth .5, volta de 40 s). */
const LAP_SECONDS = 42
const DEPTH = 0.5
const INTRO_SPREAD = 1300
const INTRO_FADE = 450

let raf = 0
let last = 0
let phase = -Math.PI / 2
let velocity = 0
let introStart = -1
let reduced = false
let visible = false
let dragging = false
let lastX = 0
let lastT = 0
let width = 0
let height = 0
const rx = ref(0)
const ry = ref(0)
const started = ref(false)
let observer: IntersectionObserver | null = null
let resize: ResizeObserver | null = null

function measure(): void {
  const el = orbitEl.value
  if (!el) return
  width = el.clientWidth
  height = el.clientHeight
  rx.value = width * 0.42
  ry.value = height * 0.3
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

  const intro = introStart < 0 ? 0 : Math.min(1, (now - introStart) / INTRO_SPREAD)
  const spread = reduced ? 1 : easeOutQuint(intro)
  // Antes da entrada, tudo escondido no ponto da frente: nada salta para a elipse.
  const appear = introStart < 0 ? 0 : reduced ? 1 : Math.min(1, (now - introStart) / INTRO_FADE)

  const radiusX = rx.value
  const radiusY = ry.value

  for (let index = 0; index < count; index += 1) {
    const node = items.value[index]
    if (!node) continue
    const base = phase + (index / count) * Math.PI * 2
    // A entrada nasce do ponto da frente e abre para a elipse.
    const angle = intro <= 0 || intro >= 1 ? base : Math.PI / 2 + (base - Math.PI / 2) * spread
    const x = Math.cos(angle) * radiusX
    const y = Math.sin(angle) * radiusY
    const front = (Math.sin(angle) + 1) / 2
    const scale = 1 + DEPTH * (0.3 * front - 0.45 * (1 - front))
    const opacity = (1 - DEPTH * 0.55 * (1 - front)) * appear
    node.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(3)})`
    node.style.opacity = opacity.toFixed(3)
    node.style.zIndex = String(Math.round(front * 100))
  }

  if (visible && !reduced) raf = requestAnimationFrame(render)
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

function startIntro(): void {
  if (introStart >= 0) return
  introStart = performance.now()
  started.value = true
  wake()
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
      if (visible) {
        startIntro()
        wake()
      }
    }, { threshold: 0.2 })
    if (orbitEl.value) observer.observe(orbitEl.value)
  }
  else {
    visible = true
    startIntro()
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  resize?.disconnect()
})
</script>

<template>
  <section id="relics" class="fr-approach" aria-labelledby="relics-approach-title">
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
          :class="{ 'is-visible': started }"
          aria-hidden="true"
          :style="{ width: `${rx * 2}px`, height: `${ry * 2}px` }"
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
