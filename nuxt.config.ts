import tailwindcss from '@tailwindcss/vite'

// Clone do jesperlandberg.com — valores de head extraídos em CLONE_SPEC.md §1/§8
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Jesper Landberg',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Swedish design engineer building visually rich, motion-driven websites. Two-time Awwwards Independent of the Year (2022 & 2024).' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Jesper Landberg' },
        { property: 'og:description', content: 'Swedish design engineer building visually rich, motion-driven websites. Two-time Awwwards Independent of the Year (2022 & 2024).' },
        { property: 'og:url', content: 'https://jesperlandberg.com/' },
        { property: 'og:site_name', content: 'Jesper Landberg' },
        { property: 'og:image', content: '/placeholders/share.svg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Jesper Landberg' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Jesper Landberg' },
        { name: 'twitter:description', content: 'Swedish design engineer building visually rich, motion-driven websites. Two-time Awwwards Independent of the Year (2022 & 2024).' },
        { name: 'twitter:image', content: '/placeholders/share.svg' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/placeholders/face.svg' },
        { rel: 'canonical', href: 'https://jesperlandberg.com/' },
      ],
    },
  },
})
