<template>
  <div class="site">
    <a class="skip-link" href="#main">{{ t('a11y.skip') }}</a>
    <CosmosBackground />
    <GlCanvas />
    <ZenitePreloader />
    <ForgeHeader />
    <main id="main" class="site__main" tabindex="-1">
      <NuxtPage />
    </main>
    <CosmosGate />
    <ScrollProgress />
    <ProfilePanel />
    <ProjectModal />
  </div>
</template>

<script setup lang="ts">
import type { Link } from 'unhead/types'
import newsreaderFont from '@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2?url'

// fiação dos painéis (Escape, clique fora, engine)
usePanels()

const { lang } = useLocale()
const { t } = useI18n()
const config = useRuntimeConfig()
const supabaseUrl = String(config.public.supabase?.url ?? '')
const headLink: Link[] = [
  // a serifa do hero é o LCP: evitar o swap tardio
  { rel: 'preload', as: 'font', type: 'font/woff2', href: newsreaderFont, crossorigin: '' },
  // primeira capa da órbita/foco (é a imagem visível no arranque)
  {
    rel: 'preload',
    as: 'image',
    href: '/images/relics/apollo-lunar-module-1-960.webp',
    imagesrcset: '/images/relics/apollo-lunar-module-1-480.webp 480w, /images/relics/apollo-lunar-module-1-960.webp 960w',
    imagesizes: '(max-width: 900px) 92vw, 560px',
  },
  ...(supabaseUrl
    ? [
        { rel: 'preconnect' as const, href: supabaseUrl },
        { rel: 'dns-prefetch' as const, href: supabaseUrl },
      ]
    : []),
]

useHead(() => ({
  htmlAttrs: { lang: lang.value === 'pt' ? 'pt-PT' : 'en' },
  link: headLink,
}))

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
  usePassport().load()
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
