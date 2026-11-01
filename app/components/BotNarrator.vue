<script setup lang="ts">
withDefaults(defineProps<{ talking?: boolean }>(), { talking: false })
</script>

<template>
  <div class="bot" :class="talking ? 'is-talking' : 'is-idle'" aria-hidden="true">
    <div class="bot__inner">
      <img
        class="bot__img bot__img--talk"
        :class="{ 'is-on': talking }"
        src="/images/rover-talking.webp"
        alt=""
        decoding="async"
      />
      <img
        class="bot__img bot__img--idle"
        :class="{ 'is-on': !talking }"
        src="/images/rover-static.webp"
        alt=""
        decoding="async"
      />
    </div>
  </div>
</template>
