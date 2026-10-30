<template>
  <div v-if="show" class="fixed inset-0 z-99">
    <div ref="fadeRef" class="absolute inset-0 bg-black transition-opacity duration-[350ms] ease-out" />
    <div class="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div class="flex gap-x-8">
        <div v-for="index in 3" :key="index" data-gl="bar" class="h-5 w-50 rounded-[2rem]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const show = ref(true)
const fadeRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  const engine = useGlEngine()
  engine.booted.then(async () => {
    const el = fadeRef.value
    if (el) el.style.opacity = '0'
    await engine.exitBars()
    engine.enterAll()
    show.value = false
  })
})
</script>
