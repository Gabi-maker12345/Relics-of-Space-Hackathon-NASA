<template>
  <div class="site">
    <CosmosBackground />
    <GlCanvas />
    <main class="site__main">
      <NuxtPage />
    </main>
    <ForgeHeader />
    <CosmosGate />
    <ScrollProgress />
    <ProfilePanel />
    <ProjectModal />
    <BootLoader />
  </div>
</template>

<script setup lang="ts">
// fiação dos painéis (Escape, clique fora, engine)
usePanels()

const { lang } = useLocale()
useHead(() => ({ htmlAttrs: { lang: lang.value === 'pt' ? 'pt-PT' : 'en' } }))

onMounted(() => {
  useRelics().load()
  useAuth().restore()
  useSound().load()
  useLocale().load()
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
