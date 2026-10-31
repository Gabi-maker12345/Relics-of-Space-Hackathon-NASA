<script setup lang="ts">
const props = defineProps<{ label: string; href?: string }>()

const letters = computed(() =>
  [...props.label].map((letter, index) => ({
    key: `${letter}-${index}`,
    char: letter === ' ' ? '\u00A0' : letter,
    delay: `${(index * 0.02).toFixed(2)}s`,
  })),
)
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :type="href ? undefined : 'button'"
    class="fr-cta"
  >
    <span>
      <span v-for="letter in letters" :key="letter.key" :style="{ transitionDelay: letter.delay }">{{ letter.char }}</span>
    </span>
  </component>
</template>
