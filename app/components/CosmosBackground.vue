<script setup lang="ts">
const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Star {
  x: number
  y: number
  r: number
  depth: number
  phase: number
  speed: number
  tint: string
}

let frame = 0

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  if (!context) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const palette = ['#ffffff', '#dbe7ff', '#b9cdff', '#ffe9c9']
  let width = 0
  let height = 0
  let stars: Star[] = []
  let scrollY = 0

  const build = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    const density = Math.round((width * height) / 9000)
    const count = Math.min(520, Math.max(180, density))
    stars = Array.from({ length: count }, () => {
      const depth = 0.25 + Math.random() * 0.75
      return {
        x: Math.random() * width,
        y: Math.random() * height * 2 - height * 0.5,
        r: 0.4 + depth * 1.5,
        depth,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.6,
        tint: palette[Math.floor(Math.random() * palette.length)],
      }
    })
  }

  const draw = (time: number) => {
    frame = requestAnimationFrame(draw)
    context.clearRect(0, 0, width, height)
    const drift = reduced ? 0 : time / 42000
    for (const star of stars) {
      const parallax = (scrollY * 0.28 * star.depth) % (height * 1.5)
      let y = star.y - parallax
      if (y < -20) y += height * 1.5
      if (y > height + 20) y -= height * 1.5
      const x = (star.x + drift * star.depth * 26) % width
      const twinkle = reduced ? 1 : 0.62 + 0.38 * Math.sin(time / (700 + star.speed * 420) + star.phase)
      context.globalAlpha = (0.18 + 0.72 * star.depth) * twinkle
      context.fillStyle = star.tint
      context.beginPath()
      context.arc(x, y, star.r, 0, Math.PI * 2)
      context.fill()
    }
    context.globalAlpha = 1
  }

  const onScroll = () => {
    scrollY = window.scrollY
  }

  build()
  scrollY = window.scrollY
  draw(0)
  window.addEventListener('resize', build)
  window.addEventListener('scroll', onScroll, { passive: true })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', build)
    window.removeEventListener('scroll', onScroll)
  })
})
</script>

<template>
  <div class="cosmos" aria-hidden="true">
    <canvas ref="canvasRef" class="cosmos__canvas" />
    <div class="cosmos__nebula" />
  </div>
</template>

<style scoped>
.cosmos {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 50% 0%, #0a0f1e 0%, #05060b 55%, #020306 100%);
}

.cosmos__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.cosmos__nebula {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(38% 26% at 18% 24%, rgba(92, 120, 255, 0.14), transparent 70%),
    radial-gradient(46% 30% at 78% 68%, rgba(255, 126, 92, 0.1), transparent 70%),
    radial-gradient(30% 22% at 62% 18%, rgba(197, 160, 100, 0.08), transparent 70%);
  filter: blur(6px);
  opacity: 0.9;
}
</style>
