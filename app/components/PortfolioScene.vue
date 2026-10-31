<script setup lang="ts">
const section = ref<HTMLElement | null>(null)
const live = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  const el = section.value
  if (!el) return
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      const active = entry.intersectionRatio > 0.99
      document.documentElement.dataset.scene = active ? 'portfolio' : ''
      setSmoothScrollEnabled(!active)
      live.value = entry.isIntersecting && entry.intersectionRatio > 0.15
    },
    { threshold: [0, 0.5, 0.99, 1] },
  )
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  delete document.documentElement.dataset.scene
})
</script>

<template>
  <section id="portfolio" ref="section" class="fr-portfolio" :class="{ 'is-live': live }" aria-labelledby="portfolio-title">
    <h2 id="portfolio-title" class="sr-only">Arquivo do portfólio</h2>
    <div class="fr-portfolio__stage">
      <FeaturedCarousel />
    </div>
    <p class="fr-label fr-portfolio__label">Arquivo do portfólio</p>
  </section>
</template>
