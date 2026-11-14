<template>
  <div class="absolute inset-0 flex flex-col justify-center px-40 py-25 s:px-80 s:py-40">
    <h2 data-gl="text" class="text-35 tracking-[-0.035em] leading-14 [-webkit-text-fill-color:transparent]">Arquivo</h2>
    <p data-gl="text" class="label opacity-60 mt-15 [-webkit-text-fill-color:transparent]">— as relíquias que continuam lá fora</p>
    <ul class="flex list-none flex-col gap-y-8 mt-25 s:mt-30">
      <li v-for="relic in relics" :key="relic.id" class="border-b border-white/10 pb-10">
        <p data-gl="text" class="label flex items-center justify-between [-webkit-text-fill-color:transparent]">
          <span class="text-16 s:text-18 tracking-[-0.05em]">{{ relic.name }}</span>
          <span class="opacity-50">{{ relic.mission }}</span>
        </p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { relics } from '~/data/relics'
</script>
