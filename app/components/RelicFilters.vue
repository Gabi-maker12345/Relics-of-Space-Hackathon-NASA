<script setup lang="ts">
withDefaults(defineProps<{ overlay?: boolean }>(), { overlay: false })

const { filters, search, hasFilters, toggleLocation, toggleStatus, clear } = useRelicFilters()
const { t } = useI18n()
const { relics, pending } = usePublicRelics(filters)

const count = computed(() => relics.value.length)
</script>

<template>
  <form
    class="fr-filters"
    :class="{ 'fr-filters--overlay': overlay }"
    role="search"
    :aria-label="t('filters.aria')"
    @submit.prevent
  >
    <div class="fr-filters__groups">
      <fieldset class="fr-filters__group">
        <legend class="fr-label" :class="{ 'fr-sr-only': overlay }">{{ t('filters.location') }}</legend>
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
            {{ t(`location.${option.value}` as 'location.moon') }}
          </button>
        </div>
      </fieldset>

      <fieldset class="fr-filters__group">
        <legend class="fr-label" :class="{ 'fr-sr-only': overlay }">{{ t('filters.status') }}</legend>
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
            {{ t(`status.${option.value}` as 'status.active') }}
          </button>
        </div>
      </fieldset>
    </div>

    <div class="fr-filters__search">
      <label class="fr-label" :class="{ 'fr-sr-only': overlay }" for="relic-search">{{ t('filters.search') }}</label>
      <input
        id="relic-search"
        v-model="search"
        class="fr-filters__input"
        type="search"
        :placeholder="t('filters.searchPlaceholder')"
        autocomplete="off"
        spellcheck="false"
      >
      <button v-if="hasFilters" type="button" class="fr-filters__clear" @click="clear">
        {{ t('filters.clear') }}
      </button>
    </div>

    <p class="fr-filters__count" :class="{ 'is-pending': pending }" aria-live="polite">
      {{ t('filters.results', { count }) }}
    </p>
  </form>
</template>
