<template>
  <Teleport to="body">
    <Transition name="nasa">
      <div
        v-if="open"
        class="nasa"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nasa-title"
        data-lenis-prevent
      >
        <button type="button" class="nasa__scrim" :aria-label="t('common.close')" @click="close" />

        <section class="nasa__panel">
          <header class="nasa__head">
            <div>
              <p class="nasa__kicker">NASA</p>
              <h2 id="nasa-title" class="nasa__title">{{ t('nasa.title') }}</h2>
              <p class="nasa__subtitle">{{ t('nasa.subtitle') }}</p>
            </div>
            <button type="button" class="nasa__x" :aria-label="t('common.close')" @click="close">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
            </button>
          </header>

          <div class="nasa__search">
            <label class="nasa__query">
              <span class="sr-only">{{ t('nasa.search') }}</span>
              <input
                ref="input"
                v-model="query"
                type="search"
                class="nasa__input"
                :placeholder="t('nasa.searchPlaceholder')"
                autocomplete="off"
                @keyup.enter="search"
              >
            </label>

            <div class="nasa__chips" role="group" :aria-label="t('nasa.subtitle')">
              <button
                v-for="option in mediaOptions"
                :key="option.value"
                type="button"
                class="nasa__chip"
                :class="{ 'is-on': mediaType === option.value }"
                :aria-pressed="mediaType === option.value"
                @click="selectMedia(option.value)"
              >{{ t(option.label) }}</button>
            </div>

            <button type="button" class="nasa__go" :disabled="loading" @click="search">
              {{ loading ? t('nasa.loading') : t('nasa.search') }}
            </button>
          </div>

          <p v-if="!canImport" class="nasa__notice">{{ t('nasa.needsRelic') }}</p>
          <p v-else class="nasa__note">{{ t('nasa.note') }}</p>

          <div class="nasa__body">
            <p v-if="loading" class="nasa__state">{{ t('nasa.loading') }}</p>
            <p v-else-if="error" class="nasa__state nasa__state--error" role="alert">{{ error }}</p>
            <p v-else-if="!searched" class="nasa__state">{{ t('nasa.start') }}</p>
            <p v-else-if="items.length === 0" class="nasa__state">{{ t('nasa.empty') }}</p>

            <template v-else>
              <p class="nasa__count">{{ t('nasa.results', { count: total }) }}</p>
              <div class="nasa__grid">
                <article v-for="item in items" :key="item.nasa_id" class="nasa-card">
                  <div class="nasa-card__media">
                    <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title" loading="lazy" decoding="async">
                    <span v-else class="nasa-card__noimg">NASA</span>
                    <span class="nasa-card__type">{{ item.media_type === 'video' ? t('nasa.videos') : t('nasa.images') }}</span>
                  </div>

                  <div class="nasa-card__body">
                    <h3 class="nasa-card__title">{{ item.title }}</h3>
                    <p class="nasa-card__credit">{{ t('nasa.credit') }}: {{ item.credit }}</p>
                  </div>

                  <button
                    type="button"
                    class="nasa-card__import"
                    :disabled="!canImport || importing === item.nasa_id || imported.has(item.nasa_id)"
                    @click="importItem(item)"
                  >
                    {{
                      imported.has(item.nasa_id)
                        ? t('nasa.imported')
                        : importing === item.nasa_id
                          ? t('nasa.importing')
                          : t('nasa.import')
                    }}
                  </button>
                </article>
              </div>

              <button
                v-if="hasMore"
                type="button"
                class="nasa__more"
                :disabled="loadingMore"
                @click="loadMore"
              >
                {{ loadingMore ? t('nasa.loading') : t('nasa.loadMore') }}
              </button>
            </template>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Relic, RelicScene } from '~/data/relics'

interface NasaItem {
  nasa_id: string
  title: string
  description: string
  media_type: 'image' | 'video'
  thumbnail: string
  credit: string
  source_url: string
  date_created: string | null
  center: string | null
}

interface NasaSearchResponse {
  items: NasaItem[]
  total: number
  page: number
  page_size: number
}

type MediaFilter = 'all' | 'image' | 'video'

const props = defineProps<{
  open: boolean
  relicId: string | null
}>()

const emit = defineEmits<{
  close: []
  imported: [scene: RelicScene]
}>()

const { t } = useI18n()

const PAGE_SIZE = 12

const mediaOptions: Array<{ value: MediaFilter, label: 'nasa.all' | 'nasa.images' | 'nasa.videos' }> = [
  { value: 'all', label: 'nasa.all' },
  { value: 'image', label: 'nasa.images' },
  { value: 'video', label: 'nasa.videos' },
]

const query = ref('')
const mediaType = ref<MediaFilter>('all')
const items = ref<NasaItem[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const loadingMore = ref(false)
const searched = ref(false)
const error = ref('')
const importing = ref<string | null>(null)
const imported = ref<Set<string>>(new Set())
const input = ref<HTMLInputElement | null>(null)

const canImport = computed(() => Boolean(props.relicId))
const hasMore = computed(() => items.value.length < total.value)

/** Ignores responses from an outdated query (fast typing / filter changes). */
let searchToken = 0

function close(): void {
  emit('close')
}

async function fetchPage(target: number, append: boolean): Promise<void> {
  const q = query.value.trim()
  if (q.length < 2) {
    error.value = t('nasa.minChars')
    return
  }

  const token = ++searchToken
  if (append) loadingMore.value = true
  else loading.value = true
  error.value = ''

  try {
    const result = await $fetch<NasaSearchResponse>('/api/admin/nasa/search', {
      query: {
        q,
        media_type: mediaType.value === 'all' ? undefined : mediaType.value,
        page: target,
        page_size: PAGE_SIZE,
      },
    })
    if (token !== searchToken) return

    const seen = new Set(items.value.map(item => item.nasa_id))
    items.value = append
      ? [...items.value, ...result.items.filter(item => !seen.has(item.nasa_id))]
      : result.items
    total.value = result.total
    page.value = target
    searched.value = true
  }
  catch (err: unknown) {
    if (token !== searchToken) return
    const apiError = err as { data?: { message?: string }, message?: string }
    error.value = apiError.data?.message || t('nasa.error')
    if (!append) {
      items.value = []
      total.value = 0
    }
  }
  finally {
    if (token === searchToken) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

async function search(): Promise<void> {
  searched.value = true
  if (query.value.trim().length < 2) {
    items.value = []
    total.value = 0
    error.value = t('nasa.minChars')
    return
  }
  await fetchPage(1, false)
}

async function loadMore(): Promise<void> {
  if (loadingMore.value || !hasMore.value) return
  await fetchPage(page.value + 1, true)
}

function selectMedia(value: MediaFilter): void {
  mediaType.value = value
  if (query.value.trim().length >= 2) {
    void search()
  }
  else {
    searched.value = false
    error.value = ''
  }
}

async function importItem(item: NasaItem): Promise<void> {
  if (!props.relicId || importing.value) return

  importing.value = item.nasa_id
  error.value = ''
  try {
    const relic = await $fetch<Relic>(`/api/admin/relics/${encodeURIComponent(props.relicId)}/media/import`, {
      method: 'POST',
      body: { nasa_id: item.nasa_id },
    })
    const scene = relic.scenes?.at(-1)
    if (scene) emit('imported', scene)
    imported.value = new Set(imported.value).add(item.nasa_id)
  }
  catch (err: unknown) {
    const apiError = err as { data?: { message?: string }, message?: string }
    error.value = apiError.data?.message || t('nasa.importError')
  }
  finally {
    importing.value = null
  }
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    if (open) {
      await nextTick()
      input.value?.focus()
      window.addEventListener('keydown', onKey)
    }
    else {
      window.removeEventListener('keydown', onKey)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.nasa {
  position: fixed;
  inset: 0;
  z-index: 160;
  display: grid;
  place-items: center;
  padding: 24px;
}

.nasa__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: color-mix(in srgb, #03040a 86%, transparent);
  backdrop-filter: blur(12px);
  cursor: default;
}

.nasa__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(1120px, 100%);
  max-height: min(90vh, 900px);
  overflow: hidden;
  color: var(--fr-fg, #e8e6e1);
  background:
    radial-gradient(70% 40% at 50% -10%, color-mix(in srgb, var(--accent, #7aa2ff) 12%, transparent), transparent 70%),
    #070910;
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: 0 60px 160px rgb(0 0 0 / 72%);
}

.nasa__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 32px 18px;
}

.nasa__kicker {
  margin: 0 0 8px;
  font-size: 9px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.45;
}

.nasa__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(26px, 3vw, 40px);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.nasa__subtitle {
  margin: 8px 0 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  opacity: 0.6;
}

.nasa__x {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 50%;
  cursor: pointer;
}

.nasa__x svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.2; }

.nasa__search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 0 32px 18px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.nasa__input {
  width: 100%;
  padding: 12px 14px;
  font: inherit;
  font-size: 14px;
  color: inherit;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 3px;
  outline: none;
}

.nasa__input:focus-visible { border-color: color-mix(in srgb, var(--accent, #7aa2ff) 60%, transparent); }

.nasa__chips { display: inline-flex; gap: 6px; }

.nasa__chip, .nasa__go, .nasa-card__import {
  padding: 10px 12px;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 3px;
  cursor: pointer;
}

.nasa__chip.is-on { background: rgb(255 255 255 / 12%); }
.nasa__chip:hover, .nasa__go:hover, .nasa-card__import:hover { background: rgb(255 255 255 / 7%); }

.nasa__go {
  background: var(--fr-fg, #e8e6e1);
  color: #06070c;
  border-color: transparent;
}

.nasa__go:disabled, .nasa-card__import:disabled { opacity: 0.4; cursor: default; }

.nasa__notice, .nasa__note {
  margin: 0;
  padding: 12px 32px;
  font-size: 11px;
  line-height: 1.4;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.nasa__notice { color: #f5d58a; }
.nasa__note { opacity: 0.55; }

.nasa__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 32px 30px;
  overscroll-behavior: contain;
}

.nasa__state { margin: 20px 0; font-size: 12px; opacity: 0.6; }
.nasa__state--error { color: #ff9a9a; opacity: 1; }
.nasa__count { margin: 0 0 14px; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.45; }

.nasa__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}

.nasa-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: rgb(255 255 255 / 2.5%);
  border: 1px solid rgb(255 255 255 / 9%);
}

.nasa-card__media { position: relative; aspect-ratio: 16 / 9; background: #0a0c14; }
.nasa-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.nasa-card__noimg { position: absolute; inset: 0; display: grid; place-items: center; font-size: 10px; letter-spacing: 0.2em; opacity: 0.4; }

.nasa-card__type {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 6px;
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: rgb(4 6 12 / 78%);
  border: 1px solid rgb(255 255 255 / 16%);
}

.nasa-card__body { flex: 1; padding: 12px; }
.nasa-card__title { margin: 0; font-family: var(--fr-serif, inherit); font-size: 17px; font-weight: 400; line-height: 1.1; }
.nasa-card__credit { margin: 8px 0 0; font-size: 9px; line-height: 1.35; opacity: 0.5; }

.nasa-card__import { margin: 0 12px 12px; }

.nasa__more {
  display: block;
  width: 100%;
  margin: 18px 0 0;
  padding: 13px 16px;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: inherit;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 3px;
  cursor: pointer;
}

.nasa__more:hover:not(:disabled) { background: rgb(255 255 255 / 9%); }
.nasa__more:disabled { opacity: 0.5; cursor: default; }

.nasa-enter-active, .nasa-leave-active { transition: opacity 0.28s ease; }
.nasa-enter-from, .nasa-leave-to { opacity: 0; }

@media (max-width: 760px) {
  .nasa { padding: 10px; }
  .nasa__head { padding: 20px 18px 14px; }
  .nasa__search { grid-template-columns: 1fr; padding: 0 18px 14px; }
  .nasa__body { padding: 14px 18px 22px; }
  .nasa__notice, .nasa__note { padding-inline: 18px; }
  .nasa__grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
</style>
