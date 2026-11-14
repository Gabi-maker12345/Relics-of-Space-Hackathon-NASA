<script setup lang="ts">
import { splitNarrationWords } from '~/utils/narration'

const props = defineProps<{
  text: string
  active?: number
}>()

const words = computed(() => splitNarrationWords(props.text))
const spoken = computed(() => props.active ?? -1)
</script>

<template>
  <span class="narr" :aria-label="text">
    <span
      v-for="(word, i) in words"
      :key="`${word}-${i}`"
      class="narr__word"
      :class="{ 'is-on': i === spoken, 'is-past': i < spoken }"
      aria-hidden="true"
    >{{ word }}{{ i < words.length - 1 ? ' ' : '' }}</span>
  </span>
</template>
