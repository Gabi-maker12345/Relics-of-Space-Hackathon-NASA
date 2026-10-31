<template>
  <div data-modal class="fixed inset-0 z-[90] bg-black">
    <SheetFrame v-if="project" :close-to="'/'" :label="project.title" :progress="progress">
      <ProjectSheet :project="project" :index="index" @step="step" @open-media="lightbox = $event" />
    </SheetFrame>
    <div v-else class="flex h-full flex-col items-center justify-center gap-y-15">
      <h2 class="text-35 tracking-[-0.03em] leading-14">Not found</h2>
      <NuxtLink to="/" class="label pointer-events-auto underline opacity-60">Home</NuxtLink>
    </div>
    <Transition name="lb">
      <MediaLightbox v-if="lightbox" :media="lightbox" @close="lightbox = null" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'
import type { Media } from '~/data/projects'

const route = useRoute()
const project = computed(() => projects.find(p => p.id === String(route.params.slug)) ?? null)

const index = ref(0)
const lightbox = ref<Media | null>(null)
const count = computed(() => project.value?.media.length ?? 1)
const progress = computed(() => (index.value + 1) / count.value)

const step = (direction: number): void => {
  index.value = (index.value + direction + count.value) % count.value
}
</script>

<style scoped>
.lb-enter-active,
.lb-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.lb-enter-from,
.lb-leave-to {
  opacity: 0;
}
</style>
