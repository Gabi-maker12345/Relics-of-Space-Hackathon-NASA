<script setup lang="ts">
const fill = ref<HTMLElement | null>(null)

let frame = 0

onMounted(() => {
  const update = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    if (fill.value) fill.value.style.transform = `scaleX(${0.0005 + progress * 0.9995})`
    frame = 0
  }
  const onScroll = () => {
    if (frame === 0) frame = requestAnimationFrame(update)
  }
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  })
})
</script>

<template>
  <div class="fr-progress fr" aria-hidden="true">
    <div ref="fill" class="fr-progress__fill" />
  </div>
</template>
