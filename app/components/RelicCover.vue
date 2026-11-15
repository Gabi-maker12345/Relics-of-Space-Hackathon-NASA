<template>
  <video
    v-if="video"
    ref="element"
    class="cover"
    :class="{ 'is-loaded': loaded }"
    :src="src"
    :poster="poster"
    muted
    loop
    playsinline
    :autoplay="autoplay"
    :preload="autoplay ? 'auto' : 'metadata'"
    :aria-label="alt"
    @loadedmetadata="loaded = true"
    @loadeddata="loaded = true"
  />
  <img
    v-else
    ref="imgEl"
    class="cover"
    :class="{ 'is-loaded': loaded }"
    :src="src"
    :srcset="srcset"
    :sizes="srcset ? sizes : undefined"
    :alt="alt"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    :decoding="priority ? 'sync' : 'async'"
    @load="loaded = true"
  >
</template>

<script setup lang="ts">
import { isVideoUrl } from '~/utils/relics'

const props = withDefaults(
  defineProps<{
    src: string
    poster?: string
    alt: string
    autoplay?: boolean
    sizes?: string
    priority?: boolean
  }>(),
  { autoplay: false, poster: undefined, sizes: '100vw', priority: false },
)

const video = computed(() => isVideoUrl(props.src))
const srcset = computed(() => imageSrcset(props.src))
const element = ref<HTMLVideoElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
/** A capa entra em fade: nada de imagens a "saltar" sobre o card vazio. */
const loaded = ref(false)

watch(() => props.src, () => {
  loaded.value = false
  void nextTick(() => {
    if (video.value) {
      if ((element.value?.readyState ?? 0) >= 1) loaded.value = true
      return
    }
    if (imgEl.value?.complete && imgEl.value.naturalWidth > 0) loaded.value = true
  })
})

watch(() => props.autoplay, (on) => {
  if (!video.value || !element.value) return
  if (on) void element.value.play().catch(() => {})
  else element.value.pause()
})

onMounted(() => {
  if (video.value) {
    if ((element.value?.readyState ?? 0) >= 1) loaded.value = true
    if (props.autoplay) void element.value?.play().catch(() => {})
    return
  }
  // A imagem pode ter carregado antes da hidratação: o evento `load` já passou.
  if (imgEl.value?.complete && imgEl.value.naturalWidth > 0) loaded.value = true
})
</script>

<style scoped>
.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.cover.is-loaded {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .cover {
    transition: none;
  }
}
</style>
