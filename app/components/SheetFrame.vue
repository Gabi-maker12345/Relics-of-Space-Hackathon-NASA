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
      <p v-if="stamp" class="sheet__stamp" aria-hidden="true">{{ stamp }}</p>
      <div class="sheet__body" data-lenis-prevent>
        <slot />
      </div>
      <div
        class="sheet__progress"
        aria-hidden="true"
        :style="{ '--progress': String(Math.min(progress, 0.9999)) }"
      />
      <NuxtLink
        v-if="closeTo"
        ref="closeRef"
        :to="closeTo"
        class="sheet__close"
        :aria-label="t('common.close')"
      >
        <SheetCloseIcon />
      </NuxtLink>
      <button
        v-else
        ref="closeRef"
        type="button"
        class="sheet__close"
        :aria-label="t('common.close')"
        @click="emit('close')"
      >
        <SheetCloseIcon />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
withDefaults(
  defineProps<{
    overlay?: boolean
    closeTo?: string
    label?: string
    progress?: number
    glitch?: boolean
    /** Selo de carimbo no canto superior esquerdo (passaporte). */
    stamp?: string
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
