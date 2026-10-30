<template>
  <div class="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between px-40 py-25 s:px-80 s:py-40 text-white [-webkit-text-fill-color:transparent]">
    <div class="flex items-start justify-between">
      <NuxtLink
        data-gl="text"
        to="/"
        class="label pointer-events-auto cursor-pointer relative whitespace-nowrap before:absolute before:-inset-15"
      >Jesper Landberg</NuxtLink>
      <button
        type="button"
        :aria-expanded="active === 'profile'"
        data-gl="text"
        class="label pointer-events-auto relative whitespace-nowrap before:absolute before:-inset-15 transition-opacity duration-300 ease-out has-hover:hover:opacity-60"
        @click="toggle('profile')"
      >{{ active === 'profile' ? 'Close' : 'Profile' }}</button>
    </div>
    <div class="relative flex justify-start">
      <nav class="label relative pointer-events-auto flex gap-x-5 whitespace-nowrap before:absolute before:-inset-15" aria-label="Project views">
        <NuxtLink
          :aria-current="route.path === '/' ? 'page' : undefined"
          data-gl="text"
          to="/"
          class="relative before:absolute before:-inset-y-15 before:-left-15 before:-right-2 transition-opacity duration-500 ease-out has-hover:hover:opacity-100"
          :class="route.path === '/' ? 'router-link-active router-link-exact-active' : ''"
        >Featured</NuxtLink>
        <span aria-hidden="true" data-gl="text">/</span>
        <NuxtLink
          data-gl="text"
          to="/full"
          class="relative before:absolute before:-inset-y-15 before:-left-2 before:-right-15 transition-opacity duration-500 ease-out has-hover:hover:opacity-100"
          :class="route.path === '/full' ? '' : 'opacity-50'"
        >Full</NuxtLink>
      </nav>
      <button
        type="button"
        :aria-expanded="active === 'news'"
        data-gl="text"
        class="label pointer-events-auto absolute bottom-0 right-0 whitespace-nowrap before:absolute before:-inset-15 transition-opacity duration-300 ease-out has-hover:hover:opacity-60"
        @click="toggle('news')"
      >{{ active === 'news' ? 'Close' : 'Newsletter' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { active, toggle } = usePanels()
</script>
