<template>
  <section class="fr-ends" aria-labelledby="ends-title">
    <div class="fr-grid">
      <div style="grid-column: 1 / -1">
        <p class="fr-label" style="color: color-mix(in srgb, var(--fr-paper) 55%, transparent)">
          Fim da transmissão
        </p>
        <h2 v-reveal id="ends-title" class="fr-serif fr-ends__title">
          O cosmos<br />
          continua.
        </h2>
        <p v-reveal="{ delay: 140 }" class="fr-body fr-ends__body">
          As relíquias continuam lá fora, em silêncio ou a transmitir. O resto deste arquivo é o trabalho que fazemos
          aqui na Terra — o que vem depois do último sinal.
        </p>
      </div>
    </div>
  </section>
</template>
