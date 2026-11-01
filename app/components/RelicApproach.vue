<script setup lang="ts">
import { missionMarquee } from '~/data/relics'

const wrap = ref<HTMLElement | null>(null)
const title = ref<HTMLElement | null>(null)
const linePath = ref<SVGPathElement | null>(null)
const items = ref<HTMLElement[]>([])
const names = missionMarquee

const setItem = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el instanceof HTMLElement) items.value[index] = el
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Formas: círculo → estrela (raios alternados) → dois anéis contrarrotativos.
 */
const shapeFactor = (index: number, total: number, starMix: number, ellipseMix: number) => {
  const star = index % 2 === 0 ? 1 : 0.46
  // a estrela desfaz-se enquanto o anel se estica numa elipse
  return 1 + (star - 1) * starMix * (1 - ellipseMix)
}

let raf = 0
let reduced = false

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const total = names.length

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    const el = wrap.value
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
    if (title.value) {
      const out = smoothstep(0.3, 0.5, p)
      title.value.style.opacity = (1 - out).toFixed(3)
      title.value.style.transform = `scale(${(1 + out * 0.12).toFixed(3)})`
      title.value.style.filter = out > 0.02 ? `blur(${(out * 8).toFixed(1)}px)` : 'none'
    }

    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    let d = ''

    for (let i = 0; i < total; i += 1) {
      const node = items.value[i]
      if (!node) continue
      const angle = (i / total) * Math.PI * 2 + rotation
      const shape = shapeFactor(i, total, starMix, infMix)
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

    if (linePath.value) {
      linePath.value.setAttribute('d', `${d}Z`)
      linePath.value.style.opacity = (0.1 + 0.34 * starMix + 0.06 * smoothstep(0.1, 0.5, p)).toFixed(3)
    }
  }

  requestAnimationFrame(loop)
})

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <section ref="wrap" class="fr-approach" aria-labelledby="relics-approach-title">
    <div class="fr-approach__stage">
      <header class="fr-approach__head">
        <h2 id="relics-approach-title" ref="title" class="fr-serif fr-approach__title">As relíquias</h2>
      </header>

      <svg class="fr-orbit__lines" aria-hidden="true">
        <path ref="linePath" d="" />
      </svg>

      <ul class="fr-orbit" aria-label="Missões do arquivo">
        <li
          v-for="(name, index) in names"
          :key="name"
          :ref="el => setItem(el, index)"
          class="fr-orbit__item"
        >
          <span class="fr-orbit__label">{{ name }}</span>
          <span class="fr-orbit__spark" aria-hidden="true">✦</span>
        </li>
      </ul>

      <p class="fr-approach__note">
        Entre 1969 e 1982, a humanidade deixou na Lua e em Marte máquinas que continuam exactamente onde pararam.
      </p>
    </div>
  </section>
</template>
