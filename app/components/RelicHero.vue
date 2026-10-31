<script setup lang="ts">
import { heroCopy } from '~/data/relics'

const section = ref<HTMLElement | null>(null)
const progress = ref(0)

let frame = 0

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

onMounted(() => {
  const measure = () => {
    frame = 0
    const el = section.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const span = rect.height - window.innerHeight
    progress.value = span > 0 ? clamp01(-rect.top / span) : 0
  }
  const onScroll = () => {
    if (frame === 0) frame = requestAnimationFrame(measure)
  }
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })
})

const phase = computed(() => {
  const p = progress.value
  const out = clamp01(p / 0.42)
  const inn = clamp01((p - 0.34) / 0.24)
  return { out, inn }
})

const firstStyle = computed(() => ({
  opacity: String(1 - phase.value.out),
  transform: `translateY(${-phase.value.out * 48}px) scale(${1 - phase.value.out * 0.03})`,
  filter: `blur(${phase.value.out * 8}px)`,
}))

const secondStyle = computed(() => ({
  opacity: String(phase.value.inn),
  transform: `translateY(${(1 - phase.value.inn) * 34}px) scale(${0.97 + phase.value.inn * 0.03})`,
  filter: `blur(${(1 - phase.value.inn) * 8}px)`,
}))
</script>

<template>
  <section ref="section" class="fr-hero" aria-label="Space Relics">
    <div class="fr-hero__sticky">
      <div class="fr-hero__layer" :style="firstStyle">
        <h1 class="fr-serif fr-hero__title">{{ heroCopy.title }}</h1>
        <p class="fr-hero__deck">{{ heroCopy.deck }}</p>
      </div>

      <div class="fr-hero__layer" :style="secondStyle" aria-hidden="false">
        <h2 class="fr-serif fr-hero__title">
          Abandonados,
          <em>mas não esquecidos.</em>
        </h2>
        <p class="fr-hero__deck">{{ heroCopy.phaseTwoDeck }}</p>
      </div>

      <div class="fr-hero__dots" aria-hidden="true">
        <span :class="{ 'is-on': progress < 0.45 }" />
        <span :class="{ 'is-on': progress >= 0.45 }" />
      </div>
    </div>
  </section>
</template>
