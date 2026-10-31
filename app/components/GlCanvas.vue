<template>
  <div class="gl">
    <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" />
  </div>
</template>

<script setup lang="ts">
const canvasRef = ref<HTMLCanvasElement | null>(null)
const route = useRoute()

onMounted(async () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const engine = useGlEngine()
  await engine.init(canvas)
  attachNextFrame()
  if (import.meta.dev) {
    ;(window as unknown as Record<string, unknown>).__gl = engine
  }
})

watch(
  () => route.fullPath,
  () => nextTick(attachNextFrame),
)

function attachNextFrame(): void {
  const engine = useGlEngine()
  engine.defer(0, () => {
    engine.scan()
    const track = document.querySelector<HTMLElement>('[data-carousel]')
    if (track !== null) engine.attachTrack(track)
  })
}

onBeforeUnmount(() => useGlEngine().dispose())
</script>

<style scoped>
.gl {
  position: fixed;
  inset: 0;
  z-index: var(--gl-z, 0);
  pointer-events: none;
}
</style>
