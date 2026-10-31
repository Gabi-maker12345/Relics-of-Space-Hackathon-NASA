<script setup lang="ts">
import { relics } from '~/data/relics'

const { open } = useProjectModal()

function openRelic(id: string): void {
  if (!import.meta.client) return
  // arrastar o carrossel não deve abrir a relíquia
  if (useGlEngine().dragDistance() > 6) return
  open(id)
}
</script>

<template>
  <div
    data-carousel
    class="absolute w-full left-0 top-0 s:top-1/2 flex flex-col s:flex-row s:-translate-y-1/2 gap-y-20 s:gap-x-10 px-20 s:px-0"
  >
    <article
      v-for="relic in relics"
      :key="relic.id"
      class="relative w-full s:h-[43.5svh] s:max-h-[55rem] s:w-auto flex-none cursor-pointer rounded-15 s:rounded-20"
      :style="{ aspectRatio: relic.ratio }"
      :data-id="relic.id"
      data-gl="card"
      :data-texture="relic.image"
      @click="openRelic(relic.id)"
    >
      <p class="pointer-events-none absolute bottom-10 inset-x-10 s:bottom-10 s:inset-x-20 flex items-end justify-between">
        <span class="relative block min-w-0 flex-1 mr-10">
          <span
            class="block whitespace-nowrap text-16 s:text-18 tracking-[-0.05em] [-webkit-text-fill-color:transparent]"
            data-title
            data-gl="text"
          >{{ relic.name }}</span>
          <span
            data-gl="text"
            aria-hidden="true"
            class="mt-4 block whitespace-normal line-clamp-2 text-14 s:text-16 leading-14 tracking-[-0.05em] text-white/25 max-w-[30rem] overflow-hidden [-webkit-text-fill-color:transparent]"
          >{{ relic.tagline }}</span>
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
