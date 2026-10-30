<template>
  <div class="pointer-events-none fixed left-1/2 top-1/2 z-40 w-420 -translate-x-1/2 -translate-y-1/2 s:w-600">
    <div
      data-gl-shield
      data-shield="profile"
      :class="active === 'profile' ? '' : 'pointer-events-none [&_*]:pointer-events-none'"
      class="absolute inset-x-20 top-1/2 flex -translate-y-1/2 flex-col items-center text-center text-white [-webkit-text-fill-color:transparent]"
    >
      <p data-gl="text" class="text-14 leading-14 tracking-[-0.02em] max-w-[35rem] s:max-w-[45rem]">
        Jesper Landberg, Swedish design engineer, named Awwwards Independent of the Year in 2022 and 2024, building visually rich, motion-driven websites. Usually lead or sole developer, responsible for front-end architecture, animation, interaction and CMS, alongside international agencies and creative teams.
      </p>
      <p data-gl="text" class="label opacity-60 mt-25 s:mt-30">77 awards — 30× Awwwards, 40× FWA, 3× Webby, 2× Lovie</p>
      <ul class="flex list-none flex-wrap items-center justify-center gap-x-20 gap-y-8 mt-25 s:mt-30">
        <li>
          <a data-gl="text" href="https://www.instagram.com/jesperlandberg222/" target="_blank" rel="noopener" class="label pointer-events-auto block">Instagram</a>
        </li>
        <li>
          <a data-gl="text" href="https://x.com/jesper_alpacka" target="_blank" rel="noopener" class="label pointer-events-auto block">X</a>
        </li>
        <li>
          <a data-gl="text" href="https://www.linkedin.com/in/jesper-landberg-ba2984256/" target="_blank" rel="noopener" class="label pointer-events-auto block">LinkedIn</a>
        </li>
        <li>
          <div class="relative">
            <a data-gl="text" href="mailto:jesper@alpacka.studio" class="label pointer-events-auto block">Email</a>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const { active } = usePanels()
</script>
