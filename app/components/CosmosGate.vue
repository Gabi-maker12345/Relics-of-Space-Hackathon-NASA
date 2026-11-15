<script setup lang="ts">
const { act, back, enter } = useAct()
const { t } = useI18n()

/**
 * Barra de filtros (telemóvel): a cena começa abaixo dela. A altura é medida
 * porque a barra abre o painel e cresce com a busca/categorias.
 */
let filtersObserver: ResizeObserver | null = null

function measureFilters(): void {
  const el = document.querySelector<HTMLElement>('.gate-filters')
  if (!el) {
    document.documentElement.style.removeProperty('--gate-filters-bottom')
    return
  }
  const bottom = Math.max(0, Math.round(el.getBoundingClientRect().bottom))
  document.documentElement.style.setProperty('--gate-filters-bottom', `${bottom}px`)
}

function stopTrackingFilters(): void {
  filtersObserver?.disconnect()
  filtersObserver = null
  document.documentElement.style.removeProperty('--gate-filters-bottom')
}

watch(act, async (value) => {
  if (value !== 'scene') {
    stopTrackingFilters()
    return
  }
  await nextTick()
  measureFilters()
  const el = document.querySelector<HTMLElement>('.gate-filters')
  if (el && typeof ResizeObserver !== 'undefined') {
    filtersObserver?.disconnect()
    filtersObserver = new ResizeObserver(measureFilters)
    filtersObserver.observe(el)
  }
}, { flush: 'post' })

onBeforeUnmount(stopTrackingFilters)

/** No telemóvel não há roda: um toque ou um swipe para cima atravessa. */
let tracking = false
let startY = 0
let startX = 0

function onGateDown(event: PointerEvent): void {
  if (act.value !== 'cosmos') return
  tracking = true
  startY = event.clientY
  startX = event.clientX
}

function onGateUp(event: PointerEvent): void {
  if (!tracking) return
  tracking = false
  if (act.value !== 'cosmos') return
  const dy = startY - event.clientY
  const dx = Math.abs(event.clientX - startX)
  if (dy > 28 || (dy > -8 && dx < 10)) void enter()
}

const stars = Array.from({ length: 26 }, (_, i) => {
  const seed = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  return {
    id: i,
    style: {
      left: `${(seed(1) * 100).toFixed(2)}%`,
      top: `${(seed(2) * 100).toFixed(2)}%`,
      width: `${(1 + seed(3) * 2.2).toFixed(2)}px`,
      height: `${(1 + seed(3) * 2.2).toFixed(2)}px`,
      animationDelay: `${(seed(4) * 3).toFixed(2)}s`,
      animationDuration: `${(2.2 + seed(5) * 2.6).toFixed(2)}s`,
    },
  }
})
</script>

<template>
  <div
    class="gate"
    :class="{ 'is-open': act !== 'page', 'is-scene': act === 'scene' }"
    @pointerdown="onGateDown"
    @pointerup="onGateUp"
    @pointercancel="tracking = false"
  >
    <div class="gate__veil" aria-hidden="true" />

    <div class="gate__stars" aria-hidden="true">
      <span v-for="star in stars" :key="star.id" :style="star.style" />
    </div>

    <div class="gate__stage">
      <div class="gate__glow" aria-hidden="true" />
      <p class="fr-label gate__eyebrow">{{ t('gate.end') }}</p>
      <h2 class="gate__title">
        <span class="gate__word gate__word--l">{{ t('gate.cosmos') }}</span>
        <span class="gate__word gate__word--r">{{ t('gate.continues') }}</span>
      </h2>
      <p class="gate__hint">
        <span class="gate__hintScroll">{{ t('gate.hint') }}</span>
        <span class="gate__hintTap">{{ t('gate.tap') }}</span>
      </p>
    </div>

    <div class="gate__scene">
      <FeaturedCarousel v-if="act === 'scene'" />
    </div>

    <RelicChat v-if="act === 'scene'" />

    <Teleport to="body">
      <div v-if="act === 'scene'" class="gate-filters fr">
        <RelicFilters overlay />
      </div>
      <div v-if="act !== 'page'" class="gate-chrome fr">
        <p v-if="act === 'scene'" class="fr-label gate__label">{{ t('gate.relics') }}</p>
        <button type="button" class="gate__back" @click="back">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ t('nav.back') }}
        </button>
      </div>
    </Teleport>
  </div>
</template>
