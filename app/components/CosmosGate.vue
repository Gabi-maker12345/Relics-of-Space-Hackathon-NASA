<script setup lang="ts">
const { act, back } = useAct()

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
  <div class="gate" :class="{ 'is-open': act !== 'page', 'is-scene': act === 'scene' }">
    <div class="gate__veil" aria-hidden="true" />

    <div class="gate__stars" aria-hidden="true">
      <span v-for="star in stars" :key="star.id" :style="star.style" />
    </div>

    <div class="gate__stage">
      <div class="gate__glow" aria-hidden="true" />
      <p class="fr-label gate__eyebrow">Fim da transmissão</p>
      <h2 class="gate__title">
        <span class="gate__word gate__word--l">O cosmos</span>
        <span class="gate__word gate__word--r">continua.</span>
      </h2>
      <p class="gate__hint">Desça para atravessar</p>
    </div>

    <div class="gate__scene">
      <FeaturedCarousel v-if="act === 'scene'" />
    </div>

    <Teleport to="body">
      <div v-if="act !== 'page'" class="gate-chrome fr">
        <p v-if="act === 'scene'" class="fr-label gate__label">Relíquias</p>
        <button type="button" class="gate__back" @click="back">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Voltar
        </button>
      </div>
    </Teleport>
  </div>
</template>
