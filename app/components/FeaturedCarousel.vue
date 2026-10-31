<script setup lang="ts">
import { relics } from '~/data/relics'

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
    relics.map(relic => ({
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

function openRelic(id: string): void {
  if (!import.meta.client) return
  // arrastar o carrossel não deve abrir a relíquia
  if (useGlEngine().dragDistance() > 6) return
  open(id)
}
</script>

<template>
  <div
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
      @click="openRelic(card.id)"
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
