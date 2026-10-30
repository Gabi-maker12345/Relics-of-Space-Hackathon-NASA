<template>
  <div class="bg-black">
    <GlCanvas />
    <main class="fixed inset-0 overflow-hidden">
      <div class="sr-only">
        <h1>Jesper Landberg — design engineer</h1>
        <p>Jesper Landberg, Swedish design engineer, named Awwwards Independent of the Year in 2022 and 2024, building visually rich, motion-driven websites.</p>
        <p>Usually lead or sole developer, responsible for front-end architecture, animation, interaction and CMS, alongside international agencies and creative teams. Freelance, and available to studios and clients anywhere.</p>
        <p>77 awards — 30× Awwwards, 40× FWA, 3× Webby, 2× Lovie.</p>
        <h2>Featured work</h2>
        <ul>
          <li v-for="project in projects" :key="project.id">
            <a :href="project.slug">{{ project.title }} {{ project.description }}</a>
          </li>
        </ul>
        <h2>Elsewhere</h2>
        <ul>
          <li><a href="/full">Full index — every project by name</a></li>
          <li><a href="/newsletter">Newsletter</a></li>
          <li><a href="https://www.instagram.com/jesperlandberg222/" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="https://x.com/jesper_alpacka" target="_blank" rel="noopener">X</a></li>
          <li><a href="https://www.linkedin.com/in/jesper-landberg-ba2984256/" target="_blank" rel="noopener">LinkedIn</a></li>
          <li><a href="mailto:jesper@alpacka.studio">jesper@alpacka.studio</a></li>
          <li><a href="/llms.txt">llms.txt — what this site is, and when to use it</a></li>
        </ul>
      </div>
      <NuxtPage />
    </main>
    <ProfilePanel />
    <NewsletterPanel />
    <ProjectModal />
    <SiteChrome />
    <BootLoader />
  </div>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'

// registra a fiação dos painéis (rota /newsletter, Escape, clique fora, engine)
usePanels()
</script>
