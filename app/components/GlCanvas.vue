<template>
  <div class="gl">
    <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" />
  </div>
</template>

<script setup lang="ts">
import type { GlEngine } from '~/composables/gl/engine'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const route = useRoute()
const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
let started = false

function cleanup(): void {
  for (const event of events) window.removeEventListener(event, start)
}

function start(): void {
  if (started) return
  started = true
  cleanup()
  void ensureGlEngine()
    .then(attachNextFrame)
    .catch(() => {
      // WebGL indisponível: a landing continua a funcionar em DOM.
    })
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  setGlCanvas(canvas)
  for (const event of events) window.addEventListener(event, start, { passive: true })
})

onBeforeUnmount(() => {
  cleanup()
  setGlCanvas(null)
  if (glEngineLoaded()) void loadGlEngine().then(engine => engine.dispose())
})

watch(
  () => route.fullPath,
  () => {
    if (!glEngineLoaded()) return
    void loadGlEngine().then(engine => nextTick(() => attachNextFrame(engine)))
  },
)

function attachNextFrame(engine: GlEngine): void {
  engine.defer(0, () => {
    engine.scan()
    const track = document.querySelector<HTMLElement>('[data-carousel]')
    if (track !== null) engine.attachTrack(track)
  })
}
</script>

<style scoped>
.gl {
  position: fixed;
  inset: 0;
  z-index: var(--gl-z, 0);
  pointer-events: none;
}
</style>
