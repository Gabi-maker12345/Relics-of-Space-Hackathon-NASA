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

const route = useRoute()

/**
 * O segundo acto (cosmos/cena) é um overlay fixo da landing. Se o utilizador
 * navegar para o admin com a cena aberta, o overlay continuava a cobrir a
 * página e o scroll ficava bloqueado — só um hard refresh resolvia.
 */
watch(() => route.path, (path) => {
  if (path === '/') return
  useAct().reset()
  useProjectModal().close()
  usePanels().close()
})

onMounted(async () => {
  useSound().load()
  useLocale().load()
  await useAuth().restore()
  await useRelics().load(true)
  initSmoothScroll()
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
