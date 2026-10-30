<template>
  <div class="pointer-events-none fixed left-1/2 top-1/2 z-40 w-420 -translate-x-1/2 -translate-y-1/2 s:w-600">
    <div
      data-gl-shield
      data-shield="news"
      :class="active === 'news' ? '' : 'pointer-events-none [&_*]:pointer-events-none'"
      class="absolute inset-x-20 top-1/2 flex -translate-y-1/2 flex-col items-center text-center text-white [-webkit-text-fill-color:transparent]"
    >
      <NewsletterForm />
    </div>
  </div>
</template>

<script setup lang="ts">
const { active } = usePanels()
</script>
