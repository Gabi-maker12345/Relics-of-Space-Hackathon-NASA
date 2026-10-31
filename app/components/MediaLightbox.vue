<script setup lang="ts">
import type { Media } from '~/data/projects'

defineProps<{ media: Media }>()
const emit = defineEmits<{ close: [] }>()

const videoRef = ref<HTMLVideoElement | null>(null)

onMounted(() => {
  void videoRef.value?.play().catch(() => {})
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      emit('close')
    }
  }
  window.addEventListener('keydown', onKey, true)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
})
</script>

<template>
  <Teleport to="body">
    <div class="lightbox" role="dialog" aria-modal="true" :aria-label="media.label" data-lenis-prevent>
      <button type="button" class="lightbox__scrim" aria-label="Fechar" @click="emit('close')" />
      <div class="lightbox__stage">
        <video
          v-if="media.kind === 'video'"
          ref="videoRef"
          class="lightbox__media"
          :src="media.src"
          :poster="media.poster"
          controls
          autoplay
          muted
          loop
          playsinline
        />
        <img v-else class="lightbox__media" :src="media.src" :alt="media.label" />
      </div>
      <div class="lightbox__bar">
        <span class="lightbox__label">{{ media.label }}</span>
        <button type="button" class="lightbox__close" aria-label="Fechar" @click="emit('close')">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>
