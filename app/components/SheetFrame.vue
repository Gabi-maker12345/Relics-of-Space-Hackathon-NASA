<template>
  <div class="flex items-center justify-center overflow-hidden" :class="overlay ? 'fixed inset-0 z-[90]' : 'absolute inset-0'">
    <div v-if="overlay" class="absolute inset-0 bg-black/95" aria-hidden="true" @click="emit('close')" />
    <div
      class="sheet"
      role="dialog"
      :aria-modal="overlay ? 'true' : undefined"
      :aria-label="label"
    >
      <div ref="scrollRef" class="sheet__scroll" @scroll.passive="onScroll">
        <slot />
      </div>
      <svg
        class="sheet__progress"
        viewBox="0 0 28 28"
        aria-hidden="true"
        :style="{ '--progress': String(progress) }"
      >
        <circle class="track" cx="14" cy="14" r="13" />
        <circle class="fill" cx="14" cy="14" r="13" />
      </svg>
      <NuxtLink
        v-if="closeTo"
        ref="closeRef"
        :to="closeTo"
        class="sheet__close"
        aria-label="Close"
      >
        <SheetCloseIcon />
      </NuxtLink>
      <button
        v-else
        ref="closeRef"
        type="button"
        class="sheet__close"
        aria-label="Close"
        @click="emit('close')"
      >
        <SheetCloseIcon />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  overlay?: boolean
  closeTo?: string
  label?: string
}>()

const emit = defineEmits<{ close: [] }>()

const scrollRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLElement | null>(null)
const progress = ref(0)
let raf = 0

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

const focusClose = (): void => {
  requestAnimationFrame(() => closeRef.value?.focus())
}

defineExpose({ focusClose, scrollEl: scrollRef })
</script>
