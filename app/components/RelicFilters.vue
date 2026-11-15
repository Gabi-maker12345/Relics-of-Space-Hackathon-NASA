<script setup lang="ts">
withDefaults(defineProps<{ overlay?: boolean }>(), { overlay: false })

const { filters, search, hasFilters, toggleLocation, toggleStatus, clear } = useRelicFilters()
const { t } = useI18n()
const { relics, pending } = usePublicRelics(filters)

const count = computed(() => relics.value.length)
const { isExplored } = usePassport()
const exploredCount = computed(() => relics.value.filter(relic => isExplored(relic.id)).length)

/** No overlay do telemóvel os filtros vivem num dropdown. */
const uid = useId()
const inputId = `${uid}-search`
const panelId = `${uid}-filters`
const panelOpen = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocumentPointerDown(event: PointerEvent): void {
  if (!panelOpen.value) return
  const target = event.target as Node | null
  if (root.value && target && root.value.contains(target)) return
  panelOpen.value = false
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') panelOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <form
    ref="root"
    class="fr-filters"
    :class="{ 'fr-filters--overlay': overlay, 'is-open': panelOpen }"
    role="search"
    :aria-label="t('filters.aria')"
    @submit.prevent
  >
    <div :id="panelId" class="fr-filters__groups">
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

      <button v-if="hasFilters" type="button" class="fr-filters__clear" @click="clear">
        {{ t('filters.clear') }}
      </button>
    </div>

    <div class="fr-filters__search">
      <label class="fr-label" :class="{ 'fr-sr-only': overlay }" :for="inputId">{{ t('filters.search') }}</label>
      <input
        :id="inputId"
        v-model="search"
        class="fr-filters__input"
        type="search"
        :placeholder="t('filters.searchPlaceholder')"
        autocomplete="off"
        spellcheck="false"
      >
      <button
        v-if="overlay"
        type="button"
        class="fr-filters__toggle"
        :class="{ 'is-on': hasFilters }"
        :aria-expanded="panelOpen"
        :aria-controls="panelId"
        @click="panelOpen = !panelOpen"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 4.5h11M4.8 8h6.4M6.6 11.5h2.8" />
        </svg>
        {{ t('filters.filter') }}
      </button>
    </div>

    <p class="fr-filters__count" :class="{ 'is-pending': pending }" aria-live="polite">
      {{ pending ? t('passport.loading') : t('passport.progress', { count: exploredCount, total: count }) }}
    </p>
  </form>
</template>
