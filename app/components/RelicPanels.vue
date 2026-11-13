<script setup lang="ts">
import type { Relic, RelicPanelCover } from '#shared/types/relic'
import { isPublished, LOCATION_LABEL, relicLocation, relicStatus } from '~/utils/relics'

type PanelRelic = Relic & { cover?: RelicPanelCover | null }

const { relics } = useRelics()
const visible = computed<PanelRelic[]>(() => relics.value.filter(isPublished) as PanelRelic[])

const wrap = ref<HTMLElement | null>(null)
const progress = ref(0)
const active = ref(0)
const scrolled = ref(0)
const viewportH = ref(900)

let frame = 0

const total = computed(() => visible.value.length)
const counter = (index: number) => `${String(index + 1).padStart(2, '0')} / ${String(total.value).padStart(2, '0')}`

/** A capa pode ser vídeo; nesse caso o poster é `relic.image`. */
const coverScene = (relic: PanelRelic) => relic.scenes?.find(scene => scene.is_cover) ?? relic.scenes?.[0]
const coverSrc = (relic: PanelRelic) => {
  if (relic.cover?.type === 'video' && relic.cover.url) return relic.cover.url
  const scene = coverScene(relic)
  return scene?.kind === 'video' ? scene.src : relic.image
}

onMounted(() => {
  const measure = () => {
    frame = 0
    const el = wrap.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const span = rect.height - window.innerHeight
    scrolled.value = Math.max(0, -rect.top)
    viewportH.value = window.innerHeight
    const p = span > 0 ? Math.min(1, Math.max(0, scrolled.value / span)) : 0
    progress.value = p
    // o passo ativo é o que está mais próximo do centro do viewport
    const next = Math.min(total.value - 1, Math.max(0, Math.floor((scrolled.value + window.innerHeight / 2) / window.innerHeight)))
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

/**
 * Quadrado a abrir (como no original): o cartão do passo seguinte nasce
 * fechado (`inset(50%)`) e abre até `inset(0)` ao longo do passo anterior.
 * O valor é scrubado pelo scroll — nada de transição de duração fixa.
 */
const cardInset = (index: number) => {
  if (index === 0) return 0
  const local = (scrolled.value - (index - 1) * viewportH.value) / viewportH.value
  return Math.max(0, Math.min(50, 50 * (1 - local)))
}
</script>

<template>
  <div v-if="visible.length === 0" class="fr-panels fr-panels--empty">
    <p class="fr-label">Arquivo vazio</p>
    <p class="fr-panels__emptyTitle">Ainda não há relíquias publicadas.</p>
  </div>

  <div v-else ref="wrap" class="fr-panels" :style="{ height: `${Math.max(1, total) * 100}vh` }">
    <aside class="fr-panels__media" aria-hidden="true">
      <div class="fr-panels__mediaInner" :style="mediaStyle">
        <div
          v-for="(relic, index) in visible"
          :key="`bg-${relic.id}`"
          class="fr-panels__layer"
          :class="{ 'is-active': index === active }"
        >
          <RelicCover :src="coverSrc(relic)" :poster="relic.image" alt="" :autoplay="index === active" />
        </div>
        <div class="fr-panels__veil" />
      </div>
    </aside>

    <div class="fr-panels__grid">
      <aside class="fr-panels__cards" aria-hidden="true">
        <div class="fr-panels__cardsInner">
          <figure
            v-for="(relic, index) in visible"
            :key="`card-${relic.id}`"
            class="fr-panels__card"
            :style="{ zIndex: index + 1, clipPath: `inset(${cardInset(index).toFixed(2)}%)` }"
          >
            <RelicCover :src="coverSrc(relic)" :poster="relic.image" alt="" :autoplay="index === active" />
          </figure>
        </div>
      </aside>

      <div class="fr-panels__copy">
        <article
          v-for="(relic, index) in visible"
          :key="relic.id"
          class="fr-step"
          :class="{ 'is-active': index === active }"
          :aria-current="index === active ? 'true' : undefined"
          :aria-labelledby="`relic-${relic.id}`"
        >
          <p class="fr-label fr-step__counter">
            {{ counter(index) }}
            <span class="fr-step__meta">
              {{ LOCATION_LABEL[relicLocation(relic)] }}
              <StatusBadge :status="relicStatus(relic)" />
            </span>
          </p>
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
