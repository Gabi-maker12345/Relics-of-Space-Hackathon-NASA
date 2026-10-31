<template>
  <div class="site">
    <CosmosBackground />
    <GlCanvas />
    <main class="site__main">
      <NuxtPage />
    </main>
    <ForgeHeader />
    <ScrollProgress />
    <ProfilePanel />
    <ProjectModal />
    <BootLoader />
  </div>
</template>

<script setup lang="ts">
// fiação dos painéis (Escape, clique fora, engine)
usePanels()

onMounted(() => {
  initSmoothScroll()
  const route = useRoute()
  if (route.path !== '/') window.scrollTo({ top: 0 })
})

onBeforeUnmount(() => destroySmoothScroll())
</script>

<style scoped>
.site {
  position: relative;
  min-height: 100vh;
}

.site__main {
  position: relative;
  z-index: 10;
}
</style>
