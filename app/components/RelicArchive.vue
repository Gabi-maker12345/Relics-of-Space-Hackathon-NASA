<script setup lang="ts">
const scrollToPortfolio = () => {
  const target = document.getElementById('portfolio')
  if (target) scrollToElement(target)
}
</script>

<template>
  <section class="fr-archive" aria-labelledby="archive-title">
    <div class="fr-archive__inner" v-reveal>
      <p class="fr-label" style="color: color-mix(in srgb, var(--fr-paper) 55%, transparent)">
        Arquivo de missões
      </p>
      <h2 id="archive-title" class="fr-serif fr-archive__title">
        O que ficou para trás
      </h2>
      <p class="fr-body" style="max-width: 48ch">
        Três relíquias, três histórias. A mesma pergunta: o que acontece com aquilo que deixamos de usar?
      </p>
      <ForgeCta label="Ver o arquivo" @click="scrollToPortfolio" />
    </div>
  </section>
</template>
