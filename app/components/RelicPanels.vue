<script setup lang="ts">
import { relics } from '~/data/relics'

const wrap = ref<HTMLElement | null>(null)
const progress = ref(0)
const active = ref(0)

let frame = 0

const total = relics.length
const counter = (index: number) => `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`

onMounted(() => {
  const measure = () => {
    frame = 0
    const el = wrap.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const span = rect.height - window.innerHeight
    const scrolled = Math.max(0, -rect.top)
    const p = span > 0 ? Math.min(1, Math.max(0, scrolled / span)) : 0
    progress.value = p
    // o passo ativo é o que está mais próximo do centro do viewport
    const next = Math.min(total - 1, Math.max(0, Math.floor((scrolled + window.innerHeight / 2) / window.innerHeight)))
    if (next !== active.value) active.value = next
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

const mediaStyle = computed(() => ({
  transform: `scale(${(1.015 + progress.value * 0.05).toFixed(4)})`,
}))
</script>

<template>
  <div ref="wrap" class="fr-panels" :style="{ height: `${total * 100}vh` }">
    <aside class="fr-panels__media" aria-hidden="true">
      <div class="fr-panels__mediaInner" :style="mediaStyle">
        <div
          v-for="(relic, index) in relics"
          :key="`bg-${relic.id}`"
          class="fr-panels__layer"
          :class="{ 'is-active': index === active }"
        >
          <img :src="relic.image" alt="" width="1376" height="768" />
        </div>
        <div class="fr-panels__veil" />
      </div>
    </aside>

    <div class="fr-panels__grid">
      <aside class="fr-panels__cards" aria-hidden="true">
        <div class="fr-panels__cardsInner">
          <figure
            v-for="(relic, index) in relics"
            :key="`card-${relic.id}`"
            class="fr-panels__card"
            :class="{ 'is-active': index === active }"
          >
            <img :src="relic.image" alt="" width="1376" height="768" />
          </figure>
        </div>
      </aside>

      <div class="fr-panels__copy">
        <article
          v-for="(relic, index) in relics"
          :key="relic.id"
          class="fr-step"
          :class="{ 'is-active': index === active }"
          :aria-current="index === active ? 'true' : undefined"
          :aria-labelledby="`relic-${relic.id}`"
        >
          <p class="fr-label fr-step__counter">{{ counter(index) }}</p>
          <h3 :id="`relic-${relic.id}`" class="fr-serif fr-step__title">{{ relic.name }}</h3>
          <p class="fr-label fr-step__mission">{{ relic.mission }}</p>
          <p class="fr-body fr-step__body">{{ relic.body }}</p>
          <dl class="fr-facts fr-step__facts">
            <div v-for="fact in relic.facts" :key="fact.label">
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  </div>
</template>
