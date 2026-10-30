<template>
  <div class="flex flex-col gap-y-40 s:flex-row s:gap-x-80">
    <div class="w-full s:w-[40rem] flex-none">
      <h2 class="text-[2.6rem] s:text-[4.2rem] leading-14 tracking-[-0.03em]">{{ project.title }}</h2>
      <p class="mt-25 text-16 s:text-18 leading-14 tracking-[-0.02em] max-w-[36rem] text-black/80">
        {{ project.description.replace(/^—\s*/, '') }}
      </p>
      <ul class="mt-25 s:mt-30 flex list-none items-center gap-x-8">
        <li>
          <span
            class="inline-flex size-35 s:size-45 items-center justify-center rounded-full bg-black text-white"
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </li>
        <li v-for="badge in project.meta" :key="badge">
          <span class="label inline-flex h-35 s:h-45 items-center rounded-full bg-black/5 px-20 text-black/70">{{ badge }}</span>
        </li>
      </ul>
    </div>
    <div class="flex-1 flex flex-col gap-y-20 min-w-0">
      <div
        v-for="(ratio, index) in mediaRatios"
        :key="index"
        class="relative w-full overflow-hidden rounded-15 bg-[#efeee9] ring-1 ring-inset ring-black/5"
        :style="{ aspectRatio: ratio }"
      >
        <span class="absolute inset-0 flex items-center justify-center label opacity-30">Image</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '~/data/projects'

const props = defineProps<{ project: Project }>()

/** slots de mídia vazios, apenas estilizados (sem assets originais) */
const mediaRatios = ['16 / 10', '4 / 3', '16 / 10', '1 / 1', '16 / 9']

void props
</script>
