<template>
  <Teleport to="body">
    <Transition name="pj" appear>
      <div v-if="project" data-modal class="fixed inset-0 z-[90]">
        <div class="absolute inset-0 bg-black/95" aria-hidden="true" @click="close" />
        <div ref="scrollRef" class="absolute inset-0 overflow-y-auto overscroll-contain" @scroll.passive="onScroll">
          <div
            class="sheet__progress"
            aria-hidden="true"
            :style="{ '--progress': String(progress) }"
          />
          <div class="sheet" role="dialog" aria-modal="true" :aria-label="project.title">
            <button
              ref="closeRef"
              type="button"
              aria-label="Close"
              class="sheet__close"
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
const scrollRef = ref<HTMLElement | null>(null)
const progress = ref(0)
let lastFocus: HTMLElement | null = null
let raf = 0

const project = computed(() => projects.find(p => p.id === activeSlug.value) ?? null)

const focusables = (): HTMLElement[] => {
  const root = closeRef.value?.closest<HTMLElement>('[role="dialog"]')
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
  ).filter(el => el.offsetParent !== null || el === document.activeElement)
}

const onKey = (e: KeyboardEvent): void => {
  if (project.value === null) return
  if (e.key === 'Escape') {
    close()
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

const onScroll = (): void => {
  if (raf !== 0) return
  raf = requestAnimationFrame(() => {
    raf = 0
    const el = scrollRef.value
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
  })
}

watch(project, (value) => {
  if (!import.meta.client) return
  if (value !== null) {
    lastFocus = (document.activeElement as HTMLElement | null) ?? null
    progress.value = 0
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => closeRef.value?.focus())
  } else {
    window.removeEventListener('keydown', onKey)
    lastFocus?.focus?.()
    lastFocus = null
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (raf !== 0) cancelAnimationFrame(raf)
})
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
.pj-enter-active .sheet {
  animation: sheet-in 0.55s cubic-bezier(0.23, 1, 0.32, 1) both;
}
.pj-leave-active .sheet {
  animation: sheet-out 0.3s cubic-bezier(0.4, 0, 1, 1) both;
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
@keyframes sheet-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(12px) scale(0.992);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pj-enter-active .sheet,
  .pj-leave-active .sheet {
    animation: none;
  }
}
</style>
