<script setup lang="ts">
const { active, toggle } = usePanels()

const socials = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/jesperlandberg222/',
    path: 'M4.6 1.8h6.8a2.8 2.8 0 0 1 2.8 2.8v6.8a2.8 2.8 0 0 1-2.8 2.8H4.6a2.8 2.8 0 0 1-2.8-2.8V4.6a2.8 2.8 0 0 1 2.8-2.8Zm0 1.3a1.5 1.5 0 0 0-1.5 1.5v6.8a1.5 1.5 0 0 0 1.5 1.5h6.8a1.5 1.5 0 0 0 1.5-1.5V4.6a1.5 1.5 0 0 0-1.5-1.5H4.6ZM8 5.1a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Zm0 1.3a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Zm3.4-1.9a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z',
    stroke: false,
  },
  {
    label: 'X',
    href: 'https://x.com/jesper_alpacka',
    path: 'M2.2 2h3.3l3 4.1L12 2h1.8L9.2 7.7 14 14h-3.3L7.5 9.6 3.9 14H2.1l4.8-5.9L2.2 2Zm1.6 1.1 8 9.8h1.1l-8-9.8H3.8Z',
    stroke: false,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jesper-landberg-ba2984256/',
    path: 'M3.1 2.3a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM2 5.7h2.2V14H2V5.7Zm3.7 0h2.1v1.1h.03c.3-.56 1.03-1.15 2.12-1.15 2.27 0 2.69 1.5 2.69 3.44V14H10.5V9.6c0-1.05-.02-2.4-1.46-2.4-1.46 0-1.68 1.14-1.68 2.32V14H5.7V5.7Z',
    stroke: false,
  },
  {
    label: 'Email',
    href: 'mailto:jesper@alpacka.studio',
    path: 'M1.4 3.6h13.2v8.8H1.4V3.6Zm1.3 1.2v6.3h10.6V4.8L8 8.4 2.7 4.8Zm1.4-.1L8 7.3l4-2.6H4.1Z',
    stroke: false,
  },
]
</script>

<template>
  <header class="fr-header fr">
    <nav class="fr-header__social" aria-label="Redes sociais">
      <a
        v-for="social in socials"
        :key="social.label"
        :href="social.href"
        :aria-label="social.label"
        :target="social.href.startsWith('http') ? '_blank' : undefined"
        :rel="social.href.startsWith('http') ? 'noopener noreferrer' : undefined"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path :d="social.path" />
        </svg>
      </a>
    </nav>

    <NuxtLink to="/" class="fr-logo" aria-label="Space Relics — início">
      <img src="/images/nasa-logo.png" alt="NASA" width="2625" height="765" />
    </NuxtLink>

    <button
      type="button"
      class="fr-profile fr-label"
      :aria-expanded="active === 'profile'"
      aria-controls="profile-panel"
      @click="toggle('profile')"
    >{{ active === 'profile' ? 'Close' : 'Profile' }}</button>
  </header>
</template>
