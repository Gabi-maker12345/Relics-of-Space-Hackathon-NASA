<template>
  <div class="relative flex min-h-screen flex-col px-40 pt-140 pb-80 s:px-80">
    <h2 data-gl="text" class="text-35 tracking-[-0.035em] leading-14 [-webkit-text-fill-color:transparent]">Arquivo</h2>
    <p data-gl="text" class="label opacity-60 mt-15 [-webkit-text-fill-color:transparent]">— as relíquias que continuam lá fora</p>
    <p class="label mt-10 text-16 opacity-80">{{ t('passport.progress', { count: explored, total }) }}</p>
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
import { isPublished } from '~/utils/relics'

const { relics: all } = useRelics()
const { isExplored } = usePassport()
const { t } = useI18n()

const relics = computed(() => all.value.filter(isPublished))
const total = computed(() => relics.value.length)
const explored = computed(() => relics.value.filter(relic => isExplored(relic.id)).length)
</script>
