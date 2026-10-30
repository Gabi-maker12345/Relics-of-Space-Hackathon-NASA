<template>
  <Teleport to="body">
    <Transition name="pj" appear>
      <div v-if="project" data-modal class="fixed inset-0 z-[90]">
        <div class="absolute inset-0 bg-black/95" aria-hidden="true" @click="close" />
        <div class="absolute inset-0 overflow-y-auto overscroll-contain">
          <div
            class="pj-sheet relative mx-auto my-20 s:my-40 w-[calc(100%-40px)] s:w-[calc(100%-80px)] rounded-20 bg-[#f6f4ef] text-[#0b0b0b] px-25 py-30 s:px-60 s:py-50"
            role="dialog"
            aria-modal="true"
            :aria-label="project.title"
          >
            <button
              ref="closeRef"
              type="button"
              aria-label="Close"
              class="absolute right-20 top-20 s:right-25 s:top-25 inline-flex size-40 s:size-45 items-center justify-center rounded-full bg-black text-white transition-transform duration-300 ease-out hover:scale-105"
              @click="close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
            <ProjectSheet :project="project" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'

const { activeSlug, close } = useProjectModal()
const closeRef = ref<HTMLButtonElement | null>(null)
let lastFocus: HTMLElement | null = null

const project = computed(() => projects.find(p => p.id === activeSlug.value) ?? null)

const onKey = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && project.value !== null) close()
}

watch(project, (value) => {
  if (!import.meta.client) return
  if (value !== null) {
    lastFocus = (document.activeElement as HTMLElement | null) ?? null
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => closeRef.value?.focus())
  } else {
    window.removeEventListener('keydown', onKey)
    lastFocus?.focus?.()
    lastFocus = null
  }
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.pj-enter-active,
.pj-leave-active {
  transition: opacity 0.3s cubic-bezier(0, 0, 0.2, 1);
}
.pj-enter-from,
.pj-leave-to {
  opacity: 0;
}
.pj-enter-active .pj-sheet {
  animation: sheet-in 0.55s cubic-bezier(0.23, 1, 0.32, 1) both;
}
@keyframes sheet-in {
  from {
    opacity: 0;
    transform: translateY(26px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
