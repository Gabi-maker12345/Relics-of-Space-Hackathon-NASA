<template>
  <div class="site">
    <a class="skip-link" href="#main">{{ t('a11y.skip') }}</a>
    <CosmosBackground />
    <GlCanvas />
    <ForgeHeader />
    <main id="main" class="site__main" tabindex="-1">
      <NuxtPage />
    </main>
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
const { t } = useI18n()
useHead(() => ({ htmlAttrs: { lang: lang.value === 'pt' ? 'pt-PT' : 'en' } }))

const { muted } = useSound()
watch(muted, () => useSoundtrack().refresh())

onMounted(async () => {
  useSound().load()
  useLocale().load()
  await useAuth().restore()
  await useRelics().load(true)
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
