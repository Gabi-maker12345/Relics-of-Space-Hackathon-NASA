import tailwindcss from '@tailwindcss/vite'

// Space Relics — base visual na especificação de forgeautomotive.co.uk (CLONE.md, Parte 1) e no portfólio existente
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Space Relics — abandonados, mas não esquecidos',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Um arquivo vivo das máquinas que a humanidade deixou na Lua e em Marte: Módulo Lunar Apollo, Opportunity e Viking 1 — e o portfólio que continua o arquivo.',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Space Relics' },
        { property: 'og:description', content: 'Um arquivo vivo das máquinas que a humanidade deixou na Lua e em Marte — e o portfólio que continua o arquivo.' },
        { property: 'og:url', content: 'https://spacerelics.space/' },
        { property: 'og:site_name', content: 'Space Relics' },
        { property: 'og:image', content: '/images/relics/opportunity.jpg' },
        { property: 'og:image:width', content: '1376' },
        { property: 'og:image:height', content: '768' },
        { property: 'og:image:alt', content: 'Space Relics' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Space Relics' },
        { name: 'twitter:description', content: 'Um arquivo vivo das máquinas que a humanidade deixou na Lua e em Marte — e o portfólio que continua o arquivo.' },
        { name: 'twitter:image', content: '/images/relics/opportunity.jpg' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/images/nasa-logo.png' },
        { rel: 'canonical', href: 'https://spacerelics.space/' },
      ],
    },
  },
})
