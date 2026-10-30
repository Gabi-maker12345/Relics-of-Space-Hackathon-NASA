<template>
  <div class="flex flex-col gap-y-40 s:flex-row s:gap-x-80">
    <div class="w-full s:w-[40rem] flex-none">
      <h2 class="sheet__title">{{ project.title }}</h2>
      <p class="mt-25 text-16 s:text-18 leading-14 tracking-[-0.02em] max-w-[36rem] text-black/80">
        {{ project.description.replace(/^—\s*/, '') }}
      </p>
      <ul class="mt-25 s:mt-30 flex list-none items-center gap-x-10">
        <li>
          <NuxtLink
            :to="project.slug"
            class="chip chip--arrow"
            :aria-label="`Open ${project.title}`"
            @click="onNavigate"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3.6 10.4 10.2 3.8M4.9 3.8h5.3v5.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </NuxtLink>
        </li>
        <li v-for="badge in project.meta" :key="badge">
          <span class="chip chip--tag">{{ badge }}</span>
        </li>
      </ul>
    </div>
    <div class="sheet__media flex-1 flex flex-col gap-y-20 min-w-0">
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

const { close } = useProjectModal()

/** Do sheet/modal para a rota do projeto (fecha o modal antes de navegar). */
function onNavigate(): void {
  close()
}

/** slots de mídia vazios, apenas estilizados (sem assets originais) */
const mediaRatios = ['16 / 10', '4 / 3', '16 / 10', '1 / 1', '16 / 9']

void props
</script>
