<script setup lang="ts">
const { filters, hasFilters, clear } = useRelicFilters()
const { relics, pending, error, refresh } = usePublicRelics(filters)

const { open } = useProjectModal()
const track = ref<HTMLElement | null>(null)
const copies = ref(1)

interface CardItem {
  id: string
  copy: number
  name: string
  tagline: string
  ratio: string
  image: string
}

const cards = computed<CardItem[]>(() =>
  Array.from({ length: copies.value }, (_, copy) =>
    relics.value.map(relic => ({
      id: relic.id,
      copy,
      name: relic.name,
      tagline: relic.tagline,
      ratio: relic.ratio,
      image: relic.image,
    })),
  ).flat(),
)

const updateCopies = (): void => {
  copies.value = window.innerWidth >= 650 ? 3 : 1
}

onMounted(() => {
  updateCopies()
  window.addEventListener('resize', updateCopies)
  onBeforeUnmount(() => window.removeEventListener('resize', updateCopies))
  nextTick(() => useGlEngine().resetCarousel())
})

watch(copies, () => nextTick(() => useGlEngine().resetCarousel()))

// Filtrar troca os cartões no DOM: o engine tem de medir a faixa outra vez.
watch(() => relics.value.map(relic => relic.id).join('|'), async () => {
  await nextTick()
  const el = track.value
  if (!el) return
  const engine = useGlEngine()
  engine.scan()
  engine.attachTrack(el)
  engine.resetCarousel()
  engine.enterAll()
})

function openRelic(id: string): void {
  if (!import.meta.client) return
  // arrastar o carrossel não deve abrir a relíquia
  if (useGlEngine().dragDistance() > 6) return
  open(id)
}
</script>

<template>
  <div v-if="error && relics.length === 0" class="gate__empty fr" role="alert">
    <p class="fr-label">Não foi possível carregar o arquivo</p>
    <p class="fr-body">{{ error.message || 'Tenta novamente.' }}</p>
    <button type="button" class="fr-chip is-on" @click="refresh()">Tentar novamente</button>
  </div>
  <div v-else-if="!pending && relics.length === 0" class="gate__empty fr" role="status">
    <p class="fr-label">Sem relíquias com estes filtros</p>
    <p class="fr-body">Ajusta o local, o estado ou a pesquisa.</p>
    <button v-if="hasFilters" type="button" class="fr-chip is-on" @click="clear">Limpar filtros</button>
  </div>
  <div
    v-else
    ref="track"
    data-carousel
    data-infinite
    :data-copies="copies"
    class="absolute w-full left-0 top-0 s:top-1/2 flex flex-col s:flex-row s:-translate-y-1/2 gap-y-20 s:gap-x-10 px-20 s:px-0"
  >
    <article
      v-for="card in cards"
      :key="`${card.id}-${card.copy}`"
      class="relative w-full s:h-[43.5svh] s:max-h-[55rem] s:w-auto flex-none cursor-pointer rounded-15 s:rounded-20"
      :style="{ aspectRatio: card.ratio }"
      :data-id="card.id"
      data-gl="card"
      :data-texture="card.image"
      :aria-hidden="card.copy === 1 || copies === 1 ? undefined : 'true'"
      :tabindex="card.copy === 0 ? 0 : -1"
      role="button"
      :aria-label="`${card.name} — ${card.tagline}`"
      @click="openRelic(card.id)"
      @keydown.enter.prevent="openRelic(card.id)"
      @keydown.space.prevent="openRelic(card.id)"
    >
      <p class="pointer-events-none absolute bottom-10 inset-x-10 s:bottom-10 s:inset-x-20 flex items-end justify-between">
        <span class="relative block min-w-0 flex-1 mr-10">
          <span
            class="block whitespace-nowrap text-16 s:text-18 tracking-[-0.05em] [-webkit-text-fill-color:transparent]"
            data-title
            data-gl="text"
          >{{ card.name }}</span>
          <span
            data-gl="text"
            aria-hidden="true"
            class="mt-4 block whitespace-normal line-clamp-2 text-14 s:text-16 leading-14 tracking-[-0.05em] text-white/25 max-w-[30rem] overflow-hidden [-webkit-text-fill-color:transparent]"
          >{{ card.tagline }}</span>
        </span>
        <span
          data-gl="pill"
          data-arrow
          class="invisible relative inline-flex size-25 s:size-25 items-center justify-center rounded-full bg-black text-white"
          aria-hidden="true"
        ><span class="visible absolute inset-0 rounded-[inherit] pointer-events-auto"></span></span>
      </p>
    </article>
  </div>
</template>
