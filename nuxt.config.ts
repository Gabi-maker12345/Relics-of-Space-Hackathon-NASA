import tailwindcss from '@tailwindcss/vite'

// Zénite — base visual na especificação de forgeautomotive.co.uk (CLONE.md, Parte 1) e no portfólio existente
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  // O CSS entra no HTML para não bloquear o primeiro paint num 4G.
  features: { inlineStyles: true },
  devtools: { enabled: false },
  // Nuxt 4.6.4 resolves an unset `devServer.host` to `{}`, which crashes
  // `nuxt dev` in @nuxt/cli 4.0.1. Pinning the loopback string keeps the
  // default bind; `nuxt dev --host 0.0.0.0` still overrides it.
  devServer: { host: '127.0.0.1' },
  modules: ['@nuxtjs/supabase', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  // Auth is enforced by route handlers and by the /admin page guard.
  // The module's automatic redirect is disabled so the existing admin panel
  // can keep its own login UI.
  supabase: {
    redirect: false,
    useSsrCookies: true,
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  app: {
    head: {
      title: 'Zénite — abandonados, mas não esquecidos',
      script: [
        {
          // estado inicial do preloader antes do primeiro paint (sem flash)
          tagPosition: 'head',
          innerHTML:
            "document.documentElement.classList.add('js');"
            + "if(location.pathname.indexOf('/admin')!==0)document.documentElement.setAttribute('data-preloading','')",
        },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Um arquivo vivo das máquinas que a humanidade deixou na Lua, em Marte e no espaço profundo — e o portfólio que continua o arquivo.',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Zénite' },
        { property: 'og:description', content: 'Um arquivo vivo das máquinas que a humanidade deixou na Lua, em Marte e no espaço profundo — e o portfólio que continua o arquivo.' },
        { property: 'og:url', content: 'https://spacerelics.space/' },
        { property: 'og:site_name', content: 'Zénite' },
        { property: 'og:image', content: '/images/relics/opportunity-1.jpg' },
        { property: 'og:image:width', content: '1600' },
        { property: 'og:image:height', content: '900' },
        { property: 'og:image:alt', content: 'Zénite' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Zénite' },
        { name: 'twitter:description', content: 'Um arquivo vivo das máquinas que a humanidade deixou na Lua, em Marte e no espaço profundo — e o portfólio que continua o arquivo.' },
        { name: 'twitter:image', content: '/images/relics/opportunity-1.jpg' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/zenite-icon-64.png', sizes: '64x64' },
        { rel: 'apple-touch-icon', href: '/images/zenite-icon-180.png' },
        { rel: 'canonical', href: 'https://spacerelics.space/' },
      ],
    },
  },
})
