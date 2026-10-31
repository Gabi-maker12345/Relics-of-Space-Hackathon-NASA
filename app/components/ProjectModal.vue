<script setup lang="ts">
import { projects } from '~/data/projects'
import type { Media } from '~/data/projects'

const { activeSlug, close } = useProjectModal()
const frame = ref<{ focusSelf: () => void } | null>(null)
let lastFocus: HTMLElement | null = null

const project = computed(() => projects.find(p => p.id === activeSlug.value) ?? null)
const index = ref(0)
const lightbox = ref<Media | null>(null)

const mediaCount = computed(() => project.value?.media.length ?? 1)
const progress = computed(() => (index.value + 1) / mediaCount.value)

const step = (direction: number): void => {
  const count = mediaCount.value
  index.value = (index.value + direction + count) % count
}

watch(project, (value) => {
  index.value = 0
  lightbox.value = null
  if (!import.meta.client) return
  if (value !== null) {
    lastFocus = (document.activeElement as HTMLElement | null) ?? null
    window.addEventListener('keydown', onKey)
    void nextTick(() => frame.value?.focusSelf())
  } else {
    window.removeEventListener('keydown', onKey)
    lastFocus?.focus?.()
    lastFocus = null
  }
}, { flush: 'post' })

const focusables = (): HTMLElement[] => {
  const root = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
  ).filter(el => el.offsetParent !== null || el === document.activeElement)
}

function onKey(e: KeyboardEvent): void {
  if (project.value === null) return
  if (lightbox.value !== null) return
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
    e.preventDefault()
    step(1)
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault()
    step(-1)
    return
  }
  if (e.key !== 'Tab') return
  const items = focusables()
  if (items.length === 0) {
    e.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && (active === first || active === null || !items.includes(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || active === null || !items.includes(active))) {
    e.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="pj" appear>
      <div v-if="project" data-modal>
        <SheetFrame
          ref="frame"
          overlay
          :label="project.title"
          :progress="progress"
          @close="close"
        >
          <ProjectSheet
            :project="project"
            :index="index"
            @step="step"
            @open-media="lightbox = $event"
          />
        </SheetFrame>
        <Transition name="lb">
          <MediaLightbox v-if="lightbox" :media="lightbox" @close="lightbox = null" />
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pj-enter-active {
  transition: opacity 0.55s cubic-bezier(0.23, 1, 0.32, 1);
}

.pj-leave-active {
  transition: opacity 0.35s cubic-bezier(0.4, 0, 1, 1);
}

.pj-enter-from,
.pj-leave-to {
  opacity: 0;
}

.pj-enter-active :deep(.sheet) {
  animation: sheet-in 0.95s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.pj-leave-active :deep(.sheet) {
  animation: sheet-out 0.35s cubic-bezier(0.4, 0, 1, 1) both;
}

.pj-enter-active :deep(.psheet__info > *),
.pj-enter-active :deep(.psheet__stage) {
  animation: sheet-content-in 1s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.pj-enter-active :deep(.psheet__info > *:nth-child(1)) { animation-delay: 0.1s; }
.pj-enter-active :deep(.psheet__info > *:nth-child(2)) { animation-delay: 0.16s; }
.pj-enter-active :deep(.psheet__info > *:nth-child(3)) { animation-delay: 0.24s; }
.pj-enter-active :deep(.psheet__info > *:nth-child(4)) { animation-delay: 0.32s; }
.pj-enter-active :deep(.psheet__stage) { animation-delay: 0.2s; }

@keyframes sheet-in {
  from {
    opacity: 0;
    transform: translateY(38px) scale(0.94);
    filter: blur(14px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@keyframes sheet-out {
  from {
    opacity: 1;
    transform: none;
  }
  to {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
  }
}

@keyframes sheet-content-in {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.lb-enter-active,
.lb-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.lb-enter-from,
.lb-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pj-enter-active :deep(.sheet),
  .pj-leave-active :deep(.sheet),
  .pj-enter-active :deep(.psheet__info > *),
  .pj-enter-active :deep(.psheet__stage) {
    animation: none;
  }
}
</style>
