<template>
  <div class="absolute inset-0 flex flex-col justify-center px-40 py-25 s:px-80 s:py-40">
    <h2 data-gl="text" class="text-35 tracking-[-0.035em] leading-14 [-webkit-text-fill-color:transparent]">Full index</h2>
    <p data-gl="text" class="label opacity-60 mt-15 [-webkit-text-fill-color:transparent]">— every project by name</p>
    <ul class="flex list-none flex-col gap-y-8 mt-25 s:mt-30">
      <li v-for="project in projects" :key="project.id" class="border-b border-white/10 pb-10">
        <NuxtLink data-gl="text" :to="project.slug" class="label pointer-events-auto flex items-center justify-between has-hover:hover:opacity-100 [-webkit-text-fill-color:transparent]">
          <span class="text-16 s:text-18 tracking-[-0.05em]">{{ project.title }}</span>
          <span
            data-gl="pill"
            class="invisible relative inline-flex size-25 items-center justify-center rounded-full bg-black text-white"
            aria-hidden="true"
          ></span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { projects } from '~/data/projects'
</script>
