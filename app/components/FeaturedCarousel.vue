<template>
  <div
    data-carousel
    class="absolute w-full left-0 top-0 s:top-1/2 flex flex-col s:flex-row s:-translate-y-1/2 gap-y-20 s:gap-x-10 px-20 s:px-0"
  >
    <article
      v-for="project in projects"
      :key="project.id"
      class="relative w-full s:h-[43.5svh] s:max-h-[55rem] s:w-auto flex-none cursor-pointer rounded-15 s:rounded-20"
      :style="{ aspectRatio: project.ratio }"
      :data-id="project.id"
      data-gl="card"
      :data-texture="project.texture"
      @click="openProject(project)"
    >
      <p class="pointer-events-none absolute bottom-10 inset-x-10 s:bottom-10 s:inset-x-20 flex items-end justify-between">
        <span class="relative block min-w-0 flex-1 mr-10">
          <span
            class="absolute left-0 bottom-0 whitespace-nowrap text-16 s:text-18 tracking-[-0.05em] [-webkit-text-fill-color:transparent]"
            data-title
            data-gl="text"
          >{{ project.title }}</span>
          <span
            data-gl="text"
            aria-hidden="true"
            class="block whitespace-normal line-clamp-2 text-14 s:text-16 leading-14 tracking-[-0.05em] text-white/40 max-w-[30rem] overflow-hidden [-webkit-text-fill-color:transparent]"
          >{{ project.excerpt }}</span>
        </span>
        <span
          data-gl="pill"
          data-arrow
          class="invisible relative inline-flex size-25 s:size-25 items-center justify-center rounded-full bg-black text-white"
          aria-hidden="true"
        ></span>
      </p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'
import type { Project } from '~/data/projects'

const { open } = useProjectModal()

function openProject(project: Project): void {
  if (!import.meta.client) return
  // arrastar o carrossel não deve abrir o projeto
  if (useGlEngine().dragDistance() > 6) return
  open(project.id)
}
</script>
