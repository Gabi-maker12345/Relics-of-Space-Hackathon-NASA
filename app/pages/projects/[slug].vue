<template>
  <div data-modal class="absolute inset-0 bg-black">
    <SheetFrame v-if="project" :close-to="'/'" :label="project.title">
      <ProjectSheet :project="project" />
    </SheetFrame>
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
