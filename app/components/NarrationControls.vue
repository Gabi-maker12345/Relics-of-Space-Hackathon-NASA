<script setup lang="ts">
const { steps, stepIndex, playing, muted, toggle: togglePlay, setMuted, toggleCaptions, captions, hasNarration } = useNarration()
const { t } = useI18n()

const total = computed(() => steps.value.length)
const available = computed(() => hasNarration())
</script>

<template>
  <div v-if="total > 0" class="narr-controls" role="group" :aria-label="t('narration.group')">
    <button
      type="button"
      class="narr-btn"
      :aria-label="playing ? t('narration.pause') : t('narration.play')"
      :aria-pressed="playing"
      :disabled="!available"
      @click="togglePlay()"
    >
      <svg v-if="!playing" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path d="M4 2.5 13 8l-9 5.5z" fill="currentColor" />
      </svg>
      <svg v-else viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <rect x="3.5" y="2.5" width="3" height="11" fill="currentColor" />
        <rect x="9.5" y="2.5" width="3" height="11" fill="currentColor" />
      </svg>
    </button>

    <button
      type="button"
      class="narr-btn"
      :aria-label="muted ? t('narration.muteOff') : t('narration.muteOn')"
      :aria-pressed="muted"
      @click="setMuted(!muted)"
    >
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M2.5 6h2.2L8 3.4v9.2L4.7 10H2.5z" fill="currentColor" />
        <path v-if="!muted" d="M10.4 5.6a3.2 3.2 0 0 1 0 4.8M12.2 4a5.6 5.6 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        <path v-else d="m10.6 6.2 3.2 3.6M13.8 6.2l-3.2 3.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
    </button>

    <button
      type="button"
      class="narr-btn narr-btn--wide"
      :aria-label="captions ? t('narration.ccOff') : t('narration.ccOn')"
      :aria-pressed="captions"
      @click="toggleCaptions()"
    >
      CC
    </button>

    <p class="narr-count fr-label">{{ stepIndex + 1 }} / {{ total }}</p>
  </div>
</template>
