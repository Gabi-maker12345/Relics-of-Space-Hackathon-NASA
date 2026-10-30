<template>
  <div data-modal class="absolute inset-0 overflow-y-auto overscroll-contain bg-black">
    <div v-if="project" class="sheet">
      <NuxtLink to="/" class="sheet__close" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </NuxtLink>
      <ProjectSheet :project="project" />
    </div>
    <div v-else class="flex h-full flex-col items-center justify-center gap-y-15">
      <h2 class="text-35 tracking-[-0.03em] leading-14">Not found</h2>
      <NuxtLink to="/" class="label pointer-events-auto underline opacity-60">Home</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'

const route = useRoute()
const project = computed(() => projects.find(p => p.id === String(route.params.slug)) ?? null)
</script>
