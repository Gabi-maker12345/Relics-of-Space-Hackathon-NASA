<template>
  <div class="afield">
    <span class="afield__label">{{ label }}</span>

    <div class="afield__row">
      <input
        :value="value"
        class="afield__input"
        type="text"
        :placeholder="placeholder"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >

      <label class="afield__action" :class="{ 'is-busy': uploading }">
        <input type="file" accept="audio/*" class="sr-only" @change="onFile">
        <span>{{ uploading ? t('form.uploading', { progress }) : t('form.upload') }}</span>
      </label>

      <button
        type="button"
        class="afield__action afield__action--ghost"
        :disabled="generating || uploading || !text.trim()"
        :title="text.trim() ? t('form.generate') : t('form.errBody')"
        @click="generate"
      >
        <template v-if="generating">{{ t('form.generating') }}</template>
        <template v-else>{{ t('form.generate') }} <em>{{ t('form.tts') }}</em></template>
      </button>
    </div>

    <div v-if="value" class="afield__player">
      <button
        type="button"
        class="afield__play"
        :aria-label="playing ? t('form.audioPause') : t('form.audioListening')"
        :aria-pressed="playing"
        @click="toggle"
      >
        <svg v-if="!playing" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5l7 4.5-7 4.5z" /></svg>
        <svg v-else viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2.4v9H3zM6.6 1.5H9v9H6.6z" /></svg>
      </button>

      <span class="afield__bar" :style="{ '--pct': `${percent}%` }" aria-hidden="true">
        <span class="afield__fill" />
      </span>

      <span class="afield__time">{{ clock }}</span>

      <button type="button" class="afield__clear" @click="clear">{{ t('form.audioClear') }}</button>
    </div>

    <p v-if="error" class="afield__err" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { uploadToStorage } from '~/composables/useUpload'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    label: string
    relicId: string
    placeholder?: string
    /** Texto que o botão "Gerar áudio" envia ao TTS. */
    text?: string
  }>(),
  { placeholder: '/media/narracao.mp3', text: '', modelValue: null },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed(() => props.modelValue ?? '')

const uploading = ref(false)
const progress = ref(0)
const generating = ref(false)
const error = ref('')
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)

let audio: HTMLAudioElement | null = null

const percent = computed(() => (duration.value > 0 ? Math.min(100, (currentTime.value / duration.value) * 100) : 0))

const clock = computed(() => {
  const total = Number.isFinite(duration.value) ? duration.value : 0
  return `${format(currentTime.value)} / ${format(total)}`
})

function format(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`
}

function stop(): void {
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
  playing.value = false
  currentTime.value = 0
}

/** Player de teste: toca antes de guardar (critério do FE-15). */
async function toggle(): Promise<void> {
  if (!value.value) return
  error.value = ''

  if (playing.value) {
    audio?.pause()
    return
  }

  if (!audio || audio.dataset.src !== value.value) {
    stop()
    audio = new Audio(value.value)
    audio.preload = 'metadata'
    audio.dataset.src = value.value
    audio.addEventListener('timeupdate', () => { currentTime.value = audio?.currentTime ?? 0 })
    audio.addEventListener('loadedmetadata', () => { duration.value = audio?.duration ?? 0 })
    audio.addEventListener('ended', () => {
      playing.value = false
      currentTime.value = 0
    })
  }

  audio.volume = 0.9
  try {
    await audio.play()
    playing.value = true
  }
  catch {
    error.value = 'Não foi possível tocar este áudio.'
    playing.value = false
  }
}

async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  stop()
  error.value = ''
  uploading.value = true
  progress.value = 1
  try {
    const url = await uploadToStorage(file, 'audio', props.relicId, (value) => { progress.value = value })
    emit('update:modelValue', url)
  }
  catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao enviar o áudio.'
  }
  finally {
    uploading.value = false
    progress.value = 0
    input.value = ''
  }
}

async function generate(): Promise<void> {
  const text = props.text.trim()
  if (!text) {
    error.value = 'Escreve o texto antes de gerar o áudio.'
    return
  }

  stop()
  error.value = ''
  generating.value = true
  try {
    const result = await $fetch<{ url: string }>('/api/admin/narration/generate', {
      method: 'POST',
      body: { text, relicId: props.relicId },
    })
    emit('update:modelValue', result.url)
  }
  catch (err: unknown) {
    const apiError = err as { data?: { message?: string }, statusMessage?: string, message?: string }
    error.value = apiError.data?.message || apiError.statusMessage || 'Falha ao gerar a narração.'
  }
  finally {
    generating.value = false
  }
}

function clear(): void {
  stop()
  error.value = ''
  emit('update:modelValue', '')
}

watch(value, stop)
onBeforeUnmount(stop)
</script>

<style scoped>
.afield {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.afield__label {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.5;
}

.afield__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
}

.afield__input {
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: inherit;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 11%);
  border-radius: 3px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.afield__input:focus-visible {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 60%, transparent);
  background: rgb(255 255 255 / 6%);
}

.afield__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 13px;
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  color: inherit;
  background: rgb(255 255 255 / 5%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.afield__action:hover { background: rgb(255 255 255 / 10%); }
.afield__action.is-busy { opacity: 0.7; pointer-events: none; }

.afield__action--ghost {
  opacity: 0.4;
  cursor: not-allowed;
}

.afield__action--ghost:hover { background: rgb(255 255 255 / 5%); }

.afield__action em {
  font-style: normal;
  font-size: 7.5px;
  padding: 1px 4px;
  border: 1px solid currentColor;
  opacity: 0.8;
}

.afield__player {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 3px;
  background: rgb(255 255 255 / 2.5%);
}

.afield__play {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  cursor: pointer;
}

.afield__play svg { width: 11px; height: 11px; fill: currentColor; }

.afield__bar {
  position: relative;
  display: block;
  height: 2px;
  background: rgb(255 255 255 / 14%);
  overflow: hidden;
}

.afield__fill {
  display: block;
  height: 100%;
  width: var(--pct, 0%);
  background: currentColor;
  transition: width 0.12s linear;
}

.afield__time {
  font-size: 8.5px;
  letter-spacing: 0.08em;
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

.afield__clear {
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 0;
  opacity: 0.45;
  cursor: pointer;
}

.afield__clear:hover { opacity: 1; color: #ff9a9a; }

.afield__err {
  margin: 0;
  font-size: 11px;
  color: #ff9a9a;
}

@media (max-width: 640px) {
  .afield__row { grid-template-columns: 1fr; }
  .afield__action { justify-content: center; }
}
</style>
