<template>
  <Teleport to="body">
    <Transition name="pj" appear>
      <div v-if="project" data-modal>
        <SheetFrame
          ref="frame"
          overlay
          :label="project.title"
          @close="close"
        >
          <ProjectSheet :project="project" />
        </SheetFrame>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'

const { activeSlug, close } = useProjectModal()
const frame = ref<{ focusSelf: () => void } | null>(null)
let lastFocus: HTMLElement | null = null

const project = computed(() => projects.find(p => p.id === activeSlug.value) ?? null)

const focusables = (): HTMLElement[] => {
  const root = document.querySelector<HTMLElement>('[role="dialog"]')
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

watch(project, (value) => {
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
