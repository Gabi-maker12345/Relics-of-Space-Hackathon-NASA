<template>
  <div class="flex items-center justify-center overflow-hidden" :class="overlay ? 'fixed inset-0 z-[90]' : 'absolute inset-0'">
    <div v-if="overlay" data-scrim class="absolute inset-0 bg-black/95" aria-hidden="true" @click="emit('close')" />
    <div
      ref="frameRef"
      class="sheet outline-none"
      :class="{ 'is-glitch': glitch }"
      role="dialog"
      tabindex="-1"
      :aria-modal="overlay ? 'true' : undefined"
      :aria-label="label"
    >
      <div class="sheet__body" data-lenis-prevent>
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
withDefaults(
  defineProps<{
    overlay?: boolean
    closeTo?: string
    label?: string
    progress?: number
    glitch?: boolean
  }>(),
  { progress: 0, glitch: false },
)

const emit = defineEmits<{ close: [] }>()

const frameRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLElement | null>(null)

/** Foco no próprio dialog (sem anel no botão); Tab leva ao close. */
const focusSelf = (): void => {
  requestAnimationFrame(() => frameRef.value?.focus({ preventScroll: true }))
}

defineExpose({ focusSelf })
</script>
