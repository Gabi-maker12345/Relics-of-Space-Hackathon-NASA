<template>
  <video
    v-if="video"
    ref="element"
    class="cover"
    :src="src"
    :poster="poster"
    muted
    loop
    playsinline
    :autoplay="autoplay"
    :preload="autoplay ? 'auto' : 'metadata'"
    :aria-label="alt"
  />
  <img v-else class="cover" :src="src" :alt="alt" loading="lazy" decoding="async">
</template>

<script setup lang="ts">
import { isVideoUrl } from '~/utils/relics'

const props = withDefaults(
  defineProps<{
    src: string
    poster?: string
    alt: string
    autoplay?: boolean
  }>(),
  { autoplay: false, poster: undefined },
)

const video = computed(() => isVideoUrl(props.src))
const element = ref<HTMLVideoElement | null>(null)

watch(() => props.autoplay, (on) => {
  if (!video.value || !element.value) return
  if (on) void element.value.play().catch(() => {})
  else element.value.pause()
})

onMounted(() => {
  if (props.autoplay) void element.value?.play().catch(() => {})
})
</script>

<style scoped>
.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
