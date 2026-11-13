<script setup lang="ts">
withDefaults(defineProps<{ overlay?: boolean }>(), { overlay: false })

const { filters, search, hasFilters, toggleLocation, toggleStatus, clear } = useRelicFilters()
const { relics, pending } = usePublicRelics(filters)

const count = computed(() => relics.value.length)
</script>

<template>
  <form
    class="fr-filters"
    :class="{ 'fr-filters--overlay': overlay }"
    role="search"
    aria-label="Filtrar o arquivo"
    @submit.prevent
  >
    <div class="fr-filters__groups">
      <fieldset class="fr-filters__group">
        <legend class="fr-label" :class="{ 'fr-sr-only': overlay }">Local</legend>
        <div class="fr-filters__chips">
          <button
            v-for="option in LOCATION_OPTIONS"
            :key="option.value"
            type="button"
            class="fr-chip"
            :class="{ 'is-on': filters.location === option.value }"
            :aria-pressed="filters.location === option.value"
            @click="toggleLocation(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </fieldset>

      <fieldset class="fr-filters__group">
        <legend class="fr-label" :class="{ 'fr-sr-only': overlay }">Estado</legend>
        <div class="fr-filters__chips">
          <button
            v-for="option in STATUS_OPTIONS"
            :key="option.value"
            type="button"
            class="fr-chip"
            :class="{ 'is-on': filters.status === option.value }"
            :aria-pressed="filters.status === option.value"
            @click="toggleStatus(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </fieldset>
    </div>

    <div class="fr-filters__search">
      <label class="fr-label" :class="{ 'fr-sr-only': overlay }" for="relic-search">Pesquisar por nome</label>
      <input
        id="relic-search"
        v-model="search"
        class="fr-filters__input"
        type="search"
        placeholder="Opportunity, Viking…"
        autocomplete="off"
        spellcheck="false"
      >
      <button v-if="hasFilters" type="button" class="fr-filters__clear" @click="clear">
        Limpar
      </button>
    </div>

    <p class="fr-filters__count" :class="{ 'is-pending': pending }" aria-live="polite">
      {{ count }} {{ count === 1 ? 'relíquia' : 'relíquias' }}
    </p>
  </form>
</template>
