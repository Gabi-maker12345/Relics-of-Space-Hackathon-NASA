<script setup lang="ts">
import { missionMarquee } from '~/data/relics'

const rows = [missionMarquee, missionMarquee]
</script>

<template>
  <section class="fr-approach" aria-labelledby="relics-approach-title">
    <div class="fr-grid">
      <h2 v-reveal id="relics-approach-title" class="fr-serif fr-approach__title">
        As relíquias
      </h2>
      <p v-reveal="{ delay: 120 }" class="fr-body fr-approach__body">
        Entre 1969 e 1982, a humanidade deixou na Lua e em Marte máquinas que continuam exatamente onde pararam.
        Algumas ainda respondem. Outras só podem contar o que viram — e é isso que vamos ouvir.
      </p>
    </div>

    <div v-reveal="{ delay: 220 }" class="fr-marquee" aria-hidden="true">
      <ul v-for="(row, index) in rows" :key="index" class="fr-marquee__row">
        <li v-for="(name, itemIndex) in row" :key="`${index}-${itemIndex}`">{{ name }}</li>
      </ul>
    </div>
  </section>
</template>
