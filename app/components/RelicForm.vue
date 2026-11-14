<template>
  <Teleport to="body">
    <Transition name="form">
      <div v-if="open" class="rform" role="dialog" aria-modal="true" aria-labelledby="rform-title">
        <button class="rform__scrim" type="button" :aria-label="t('common.close')" @click="requestClose" />

        <form class="rform__sheet" novalidate @submit.prevent="save">
          <header class="rform__head">
            <div class="rform__headText">
              <p class="rform__kicker">{{ isEdit ? t('form.kickerEdit') : t('form.kickerNew') }}</p>
              <h2 id="rform-title" class="rform__title">{{ isEdit ? t('form.titleEdit') : t('form.titleNew') }}</h2>
            </div>
            <div class="rform__headActions">
              <button
                type="button"
                class="rform__previewBtn"
                :aria-pressed="previewOpen"
                :aria-controls="previewOpen ? 'relic-preview' : undefined"
                @click="previewOpen = !previewOpen"
              >
                <svg viewBox="0 0 20 14" aria-hidden="true">
                  <path d="M1 7s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" />
                  <circle cx="10" cy="7" r="2.4" />
                </svg>
                {{ t('form.preview') }}
              </button>
              <button
                type="button"
                class="rform__previewBtn"
                :aria-pressed="quizOpen"
                :disabled="!isEdit"
                :title="isEdit ? 'Criar ou editar o quiz desta relíquia' : 'Guarda a relíquia primeiro'"
                @click="quizOpen = !quizOpen"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.2" />
                  <path d="M7.9 7.6a2.3 2.3 0 1 1 3.2 2.2c-.7.3-.9.8-.9 1.5" />
                  <circle cx="10" cy="14.3" r=".9" fill="currentColor" stroke="none" />
                </svg>
                Quiz
              </button>
              <button type="button" class="rform__x" aria-label="Fechar" @click="requestClose">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
              </button>
            </div>
          </header>

          <div class="rform__body" data-lenis-prevent>
            <template v-if="!quizOpen">
            <section class="rform__group">
              <div class="rform__groupHead">
                <span class="rform__num">01</span>
                <h3 class="rform__legend">{{ t('form.identity') }}</h3>
              </div>

              <div class="rform__groupBody">
                <div class="rform__pairRow">
                  <label class="rform__field rform__field--wide">
                    <span class="rform__label">{{ t('form.name') }}</span>
                    <input v-model="draft.name" class="rform__input" placeholder="Módulo Lunar Apollo" @input="onName">
                    <span v-if="errors.name" class="rform__err">{{ errors.name }}</span>
                  </label>
                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.slug') }}</span>
                    <input v-model="draft.id" class="rform__input rform__input--mono" placeholder="apollo-lunar-module">
                    <span v-if="errors.id" class="rform__err">{{ errors.id }}</span>
                  </label>
                </div>

                <div class="rform__pairRow">
                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.mission') }}</span>
                    <input v-model="draft.mission" class="rform__input" placeholder="Apollo 11–17 · 1969–1972">
                    <span v-if="errors.mission" class="rform__err">{{ errors.mission }}</span>
                  </label>
                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.tagline') }}</span>
                    <input v-model="draft.tagline" class="rform__input" placeholder="Seis pousos, seis módulos deixados para trás.">
                    <span v-if="errors.tagline" class="rform__err">{{ errors.tagline }}</span>
                  </label>
                </div>

                <div class="rform__pairRow">
                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.status') }}</span>
                    <select v-model="draft.status" class="rform__input">
                      <option value="active">{{ t('status.active') }}</option>
                      <option value="silent">{{ t('status.silent') }}</option>
                      <option value="lost">{{ t('status.lost') }}</option>
                    </select>
                  </label>
                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.location') }}</span>
                    <select v-model="draft.location" class="rform__input">
                      <option value="moon">{{ t('location.moon') }}</option>
                      <option value="mars">{{ t('location.mars') }}</option>
                      <option value="deep_space">{{ t('location.deep_space') }}</option>
                    </select>
                  </label>
                </div>

                <label class="rform__field">
                  <span class="rform__label">{{ t('form.story') }}</span>
                  <textarea v-model="draft.body" class="rform__input rform__area" rows="4" placeholder="O que ficou para trás, contado em duas ou três frases." />
                  <span v-if="errors.body" class="rform__err">{{ errors.body }}</span>
                </label>

                <AudioField
                  v-model="draft.intro_audio_url"
                  label="Áudio de introdução (opcional)"
                  :relic-id="draft.id"
                  :text="draft.body"
                  placeholder="/media/intro.mp3"
                />
                <p class="rform__hint">{{ t('form.introAudioHint') }}</p>

                <label class="rform__field">
                  <span class="rform__label">{{ t('form.officialSource') }}</span>
                  <input v-model="draft.reference_url" class="rform__input rform__input--mono" placeholder="https://science.nasa.gov/mission/...">
                </label>
              </div>
            </section>

            <section class="rform__group">
              <div class="rform__groupHead">
                <span class="rform__num">02</span>
                <h3 class="rform__legend">{{ t('form.card') }}</h3>
              </div>

              <div class="rform__groupBody">
                <div class="rform__media">
                  <div class="rform__thumb">
                    <img v-if="draft.image" :src="draft.image" :alt="draft.alt || t('form.coverImage')" @load="onImageLoad">
                    <span v-else class="rform__thumbEmpty">{{ t('form.thumbEmpty') }}</span>
                    <label class="rform__upload">
                      <input type="file" accept="image/*" class="sr-only" @change="onFile">
                      <span>{{ draft.image ? t('form.replace') : t('form.uploadImage') }}</span>
                    </label>
                    <div
                      v-if="coverProgress"
                      class="rform__progress"
                      role="progressbar"
                      :aria-valuenow="coverProgress"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label="Envio da imagem de cartão"
                    >
                      <span :style="{ width: `${coverProgress}%` }" />
                    </div>
                  </div>

                  <div class="rform__mediaFields">
                    <label class="rform__field">
                      <span class="rform__label">{{ t('form.coverImage') }}</span>
                      <input v-model="draft.image" class="rform__input rform__input--mono" placeholder="/images/relics/nova.jpg">
                      <span v-if="errors.image" class="rform__err">{{ errors.image }}</span>
                    </label>

                    <div class="rform__pairRow">
                      <label class="rform__field">
                        <span class="rform__label">{{ t('form.alt') }}</span>
                        <input v-model="draft.alt" class="rform__input" placeholder="Descrição da imagem">
                        <span v-if="errors.alt" class="rform__err">{{ errors.alt }}</span>
                      </label>
                      <label class="rform__field">
                        <span class="rform__label">{{ t('form.ratio') }}</span>
                        <input v-model="draft.ratio" class="rform__input rform__input--mono" placeholder="1376 / 768">
                        <span v-if="errors.ratio" class="rform__err">{{ errors.ratio }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="rform__group">
              <div class="rform__groupHead">
                <span class="rform__num">03</span>
                <h3 class="rform__legend">{{ t('form.facts') }}</h3>
                <button type="button" class="rform__add" @click="addFact">{{ t('form.addFact') }}</button>
              </div>

              <div class="rform__groupBody">
                <div v-for="(fact, i) in draft.facts" :key="`fact-${i}`" class="rform__factRow">
                  <input v-model="fact.label" class="rform__input" placeholder="Rótulo — Primeiro pouso">
                  <input v-model="fact.value" class="rform__input" placeholder="Valor — 20 jul 1969">
                  <button type="button" class="rform__del" :aria-label="`Remover linha ${i + 1}`" @click="draft.facts.splice(i, 1)">
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
                  </button>
                </div>
                <span v-if="errors.facts" class="rform__err">{{ errors.facts }}</span>
              </div>
            </section>

            <section class="rform__group">
              <div class="rform__groupHead">
                <span class="rform__num">04</span>
                <h3 class="rform__legend">{{ t('form.media') }}</h3>
                <div class="rform__addRow">
                  <button type="button" class="rform__add" @click="addScene()">{{ t('form.addMedia') }}</button>
                </div>
                <p class="rform__hint">{{ t('form.mediaHint') }}</p>
              </div>

              <div class="rform__groupBody">
                <article
                  v-for="(scene, i) in draft.scenes"
                  :key="`scene-${i}`"
                  class="rform__scene"
                  :class="{ 'is-cover': isCover(scene) }"
                  @dragover.prevent
                  @drop.prevent="onDrop(i)"
                >
                  <header class="rform__sceneHead">
                    <span class="rform__sceneNum">
                      {{ t('form.scene', { n: String(i + 1).padStart(2, '0'), kind: t(scene.kind === 'video' ? 'form.video' : 'form.image') }) }}
                      <em v-if="isCover(scene)" class="rform__coverTag">capa</em>
                    </span>
                    <div class="rform__sceneTools">
                      <button type="button" class="rform__move" :disabled="i === 0" aria-label="Subir cena" @click="moveScene(i, -1)">↑</button>
                      <button type="button" class="rform__move" :disabled="i === draft.scenes.length - 1" aria-label="Descer cena" @click="moveScene(i, 1)">↓</button>
                      <span
                        class="rform__grab"
                        aria-hidden="true"
                        title="Arrastar para reordenar"
                        draggable="true"
                        @dragstart="onDragStart(i, $event)"
                      >⠿</span>
                      <div class="rform__segment" role="group" aria-label="Tipo de mídia">
                        <button type="button" :class="{ 'is-on': scene.kind === 'image' }" @click="scene.kind = 'image'">{{ t('form.image') }}</button>
                        <button type="button" :class="{ 'is-on': scene.kind === 'video' }" @click="scene.kind = 'video'">{{ t('form.video') }}</button>
                      </div>
                      <button
                        v-if="draft.scenes.length > 1"
                        type="button"
                        class="rform__del"
                        :aria-label="`Remover cena ${i + 1}`"
                        @click="removeScene(i)"
                      >
                        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
                      </button>
                    </div>
                  </header>

                  <div class="rform__sceneGrid">
                    <div class="rform__scenePreview">
                      <video
                        v-if="scene.src && scene.kind === 'video'"
                        :src="scene.src"
                        :poster="scene.poster || undefined"
                        muted
                        loop
                        playsinline
                        preload="metadata"
                      />
                      <img v-else-if="scene.src" :src="scene.src" alt="">
                      <span v-else class="rform__thumbEmpty">sem mídia</span>
                      <label class="rform__upload">
                        <input
                          type="file"
                          class="sr-only"
                          :accept="scene.kind === 'video' ? 'video/*' : 'image/*'"
                          @change="onSceneFile($event, i)"
                        >
                        <span>{{ scene.src ? t('form.replace') : t('form.uploadImage') }}</span>
                      </label>
                      <div
                        v-if="uploadIndex === i"
                        class="rform__progress"
                        role="progressbar"
                        :aria-valuenow="uploadProgress"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        :aria-label="`Envio da cena ${i + 1}`"
                      >
                        <span :style="{ width: `${uploadProgress}%` }" />
                      </div>
                    </div>

                    <div class="rform__sceneFields">
                      <label class="rform__field">
                        <span class="rform__label">{{ t('form.mediaUrl', { kind: t(scene.kind === 'video' ? 'form.video' : 'form.image') }) }}</span>
                        <input v-model="scene.src" class="rform__input rform__input--mono" placeholder="/media/loop.mp4">
                      </label>

                      <div class="rform__coverRow">
                        <button
                          type="button"
                          class="rform__cover"
                          :class="{ 'is-on': isCover(scene) }"
                          :aria-pressed="isCover(scene)"
                          @click="setCover(scene)"
                        >
                          {{ isCover(scene) ? t('form.cover') : t('form.setCover') }}
                        </button>
                        <span class="rform__coverHint">
                          {{ isCover(scene) ? t('form.coverHintOn') : t('form.coverHintOff') }}
                        </span>
                      </div>

                      <div class="rform__pairRow">
                        <label class="rform__field">
                          <span class="rform__label">{{ t('form.title') }}</span>
                          <input v-model="scene.title" class="rform__input" placeholder="Descida do módulo">
                        </label>
                        <label class="rform__field">
                          <span class="rform__label">{{ t('form.kicker') }}</span>
                          <input v-model="scene.kicker" class="rform__input" placeholder="Fotografia / Transmissão">
                        </label>
                      </div>

                      <label v-if="scene.kind === 'video'" class="rform__field">
                        <span class="rform__label">{{ t('form.poster') }}</span>
                        <input v-model="scene.poster" class="rform__input rform__input--mono" placeholder="/images/relics/poster.jpg">
                      </label>

                      <label class="rform__field">
                        <span class="rform__label">{{ t('form.caption') }}</span>
                        <textarea v-model="scene.body" class="rform__input rform__area" rows="3" placeholder="O que o diário conta nesta cena." />
                      </label>

                      <div class="rform__pairRow">
                        <label class="rform__field">
                          <span class="rform__label">{{ t('form.credit') }}</span>
                          <input v-model="scene.credit" class="rform__input" placeholder="NASA / JPL">
                        </label>
                        <label class="rform__field">
                          <span class="rform__label">{{ t('form.source') }}</span>
                          <input v-model="scene.source_url" class="rform__input rform__input--mono" placeholder="https://images.nasa.gov/…">
                        </label>
                      </div>

                      <AudioField
                        v-model="scene.audio_url"
                        label="Áudio narrado (opcional)"
                        :relic-id="draft.id"
                        :text="scene.body"
                        placeholder="/media/narracao.mp3"
                      />

                      <label v-if="scene.kind === 'video'" class="rform__check">
                        <input v-model="scene.mute_video" type="checkbox">
                        <span>Vídeo mudo + narração</span>
                      </label>

                      <p v-if="scene.src.trim() && !scene.audio_url?.trim() && !scene.body.trim()" class="rform__warn">
                        {{ t('form.noAudioNoCaption') }}
                      </p>
                    </div>
                  </div>
                </article>
                <span v-if="errors.scenes" class="rform__err">{{ errors.scenes }}</span>
              </div>
            </section>
            <section class="rform__group">
              <div class="rform__groupHead">
                <span class="rform__num">05</span>
                <h3 class="rform__legend">{{ t('form.translations') }}</h3>
                <p class="rform__hint">{{ t('form.langEn') }}</p>
              </div>

              <div class="rform__groupBody">
                <p v-if="!relic" class="rform__hint">{{ t('form.translationHint') }}</p>

                <template v-else>
                  <p v-if="translationBusy" class="rform__hint">…</p>

                  <div class="rform__pairRow">
                    <label class="rform__field">
                      <span class="rform__label">{{ t('form.name') }}</span>
                      <input v-model="translation.name" class="rform__input" :disabled="translationBusy">
                    </label>
                    <label class="rform__field">
                      <span class="rform__label">{{ t('form.slug') }}</span>
                      <input :value="relic.id" class="rform__input rform__input--mono" disabled>
                    </label>
                  </div>

                  <div class="rform__pairRow">
                    <label class="rform__field">
                      <span class="rform__label">{{ t('form.mission') }}</span>
                      <input v-model="translation.mission" class="rform__input" :disabled="translationBusy">
                    </label>
                    <label class="rform__field">
                      <span class="rform__label">{{ t('form.tagline') }}</span>
                      <input v-model="translation.summary" class="rform__input" :disabled="translationBusy">
                    </label>
                  </div>

                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.story') }}</span>
                    <textarea v-model="translation.story_text" class="rform__input rform__area" rows="4" :disabled="translationBusy" />
                  </label>

                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.alt') }}</span>
                    <input v-model="translation.alt" class="rform__input" :disabled="translationBusy">
                  </label>

                  <label class="rform__field">
                    <span class="rform__label">{{ t('form.introAudio') }}</span>
                    <input v-model="translation.intro_audio_url" class="rform__input rform__input--mono" :placeholder="'/media/intro-en.mp3'" :disabled="translationBusy">
                  </label>

                  <div
                    v-for="(item, i) in translationMedia"
                    :key="item.media_id"
                    class="rform__scene"
                  >
                    <header class="rform__sceneHead">
                      <span class="rform__sceneNum">{{ t('form.langEn') }} · {{ String(i + 1).padStart(2, '0') }}</span>
                    </header>

                    <div class="rform__pairRow">
                      <label class="rform__field">
                        <span class="rform__label">{{ t('form.title') }}</span>
                        <input v-model="item.title" class="rform__input" :disabled="translationBusy">
                      </label>
                      <label class="rform__field">
                        <span class="rform__label">{{ t('form.kicker') }}</span>
                        <input v-model="item.kicker" class="rform__input" :disabled="translationBusy">
                      </label>
                    </div>

                    <label class="rform__field">
                      <span class="rform__label">{{ t('form.caption') }}</span>
                      <textarea v-model="item.caption" class="rform__input rform__area" rows="3" :disabled="translationBusy" />
                    </label>

                    <label class="rform__field">
                      <span class="rform__label">{{ t('form.narration') }}</span>
                      <input v-model="item.audio_url" class="rform__input rform__input--mono" :disabled="translationBusy">
                    </label>
                  </div>

                  <p v-if="translationError" class="rform__err" role="alert">{{ translationError }}</p>
                  <p v-if="translationSaved" class="rform__hint" role="status">{{ t('form.translationSaved') }}</p>

                  <button
                    type="button"
                    class="rform__add rform__saveTranslation"
                    :disabled="!relic || translationBusy"
                    @click="saveTranslation"
                  >
                    {{ t('form.saveTranslation') }}
                  </button>
                </template>
              </div>
            </section>
            </template>

            <RelicQuizEditor
              v-else
              :relic-id="props.relic?.id ?? draft.id"
              :relic-name="draft.name"
              @close="quizOpen = false"
            />
          </div>

          <footer v-if="!quizOpen" class="rform__foot">
            <p class="rform__footNote">{{ t('form.footNote') }}</p>
            <label class="rform__publish">
              <input v-model="draft.published" type="checkbox">
              <span>{{ t('form.published') }}</span>
            </label>
            <label class="rform__publish">
              <input v-model="draft.is_extra" type="checkbox">
              <span>{{ t('form.extra') }}</span>
            </label>
            <span v-if="errors.general" class="rform__err">{{ errors.general }}</span>
            <div class="rform__actions">
              <button type="button" class="rform__cancel" @click="requestClose">{{ t('common.cancel') }}</button>
              <button type="submit" class="rform__save">{{ isEdit ? t('form.saveEdit') : t('form.saveNew') }}</button>
            </div>
          </footer>
        </form>

        <RelicPreview
          id="relic-preview"
          :open="previewOpen"
          :relic="previewRelic"
          @close="previewOpen = false"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Relic, RelicFact, RelicScene, RelicInput, RelicLocation, RelicStatus } from '#shared/types/relic'

const props = defineProps<{
  open: boolean
  relic: Relic | null
  takenIds: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [input: RelicInput]
  translated: []
}>()

const isEdit = computed(() => Boolean(props.relic))

type Draft = {
  id: string
  name: string
  mission: string
  tagline: string
  body: string
  image: string
  alt: string
  ratio: string
  status: RelicStatus
  location: RelicLocation
  published: boolean
  intro_audio_url: string
  reference_url: string
  is_extra: boolean
  facts: RelicFact[]
  scenes: RelicScene[]
}

const blank = (): Draft => ({
  id: '',
  name: '',
  mission: '',
  tagline: '',
  body: '',
  image: '',
  alt: '',
  ratio: '1376 / 768',
  status: 'active',
  location: 'moon',
  published: false,
  intro_audio_url: '',
  reference_url: '',
  is_extra: false,
  facts: [
    { label: '', value: '' },
    { label: '', value: '' },
    { label: '', value: '' },
    { label: '', value: '' },
  ],
  // FE-14: arranque com três vídeos e duas imagens; slots vazios não são guardados.
  scenes: [
    emptyScene('video'),
    emptyScene('video'),
    emptyScene('video'),
    emptyScene('image'),
    emptyScene('image'),
  ],
})

function emptyScene(kind: 'image' | 'video'): RelicScene {
  return {
    kind,
    src: '',
    poster: '',
    kicker: kind === 'video' ? 'Transmissão' : 'Fotografia',
    title: '',
    body: '',
    credit: '',
    source_url: '',
    audio_url: '',
    mute_video: true,
  }
}

const { t } = useI18n()

const draft = reactive<Draft>(blank())
const errors = reactive<Record<string, string>>({})
const previewOpen = ref(false)
const quizOpen = ref(false)
const translationBusy = ref(false)
const translationError = ref('')
const translationSaved = ref(false)

const translation = reactive({
  name: '',
  mission: '',
  summary: '',
  story_text: '',
  alt: '',
  intro_audio_url: '',
})

type MediaTranslationRow = {
  media_id: string
  kicker: string
  title: string
  caption: string
  audio_url: string
}

const translationMedia = ref<MediaTranslationRow[]>([])

/** Preenche o separador EN a partir da API (BE-12). */
async function loadTranslation(): Promise<void> {
  if (!props.relic) return
  translationBusy.value = true
  translationError.value = ''
  translationSaved.value = false
  try {
    const res = await $fetch<{
      relic: Record<string, string | null> | null
      media: Array<Record<string, string | null>>
    }>(`/api/admin/relics/${encodeURIComponent(props.relic.id)}/translations/en`)
    const row = res.relic ?? {}
    translation.name = row.name ?? ''
    translation.mission = row.mission ?? ''
    translation.summary = row.summary ?? ''
    translation.story_text = row.story_text ?? ''
    translation.alt = row.alt ?? ''
    translation.intro_audio_url = row.intro_audio_url ?? ''
    translationMedia.value = (props.relic.scenes ?? [])
      .filter(scene => Boolean(scene.id))
      .map((scene) => {
        const media = res.media.find(item => item.media_id === scene.id) ?? {}
        return {
          media_id: scene.id as string,
          kicker: media.kicker ?? '',
          title: media.title ?? '',
          caption: media.caption ?? '',
          audio_url: media.audio_url ?? '',
        }
      })
  }
  catch {
    translationError.value = t('form.translationHint')
  }
  finally {
    translationBusy.value = false
  }
}

async function saveTranslation(): Promise<void> {
  if (!props.relic) return
  translationBusy.value = true
  translationError.value = ''
  translationSaved.value = false
  try {
    const media = translationMedia.value
      .filter(item => item.kicker || item.title || item.caption || item.audio_url)
      .map(item => ({
        media_id: item.media_id,
        kicker: item.kicker || undefined,
        title: item.title || undefined,
        caption: item.caption || undefined,
        audio_url: item.audio_url || null,
      }))
    await $fetch(`/api/admin/relics/${encodeURIComponent(props.relic.id)}/translations/en`, {
      method: 'PUT',
      body: {
        name: translation.name || undefined,
        mission: translation.mission || undefined,
        summary: translation.summary || undefined,
        story_text: translation.story_text || undefined,
        alt: translation.alt || undefined,
        intro_audio_url: translation.intro_audio_url || null,
        media,
      },
    })
    translationSaved.value = true
    emit('translated')
  }
  catch (err: unknown) {
    const apiError = err as { data?: { message?: string }, message?: string }
    translationError.value = apiError.data?.message || apiError.message || 'Falha ao guardar a tradução.'
  }
  finally {
    translationBusy.value = false
  }
}

watch(() => props.open, (open) => {
  if (open && props.relic) void loadTranslation()
})

/** Retrato ao vivo do rascunho — o mesmo shape que o modal público consome. */
const previewScenes = computed<RelicScene[]>(() => draft.scenes
  .filter(scene => scene.src.trim())
  .map(scene => ({
    id: scene.id,
    kind: scene.kind,
    src: scene.src.trim(),
    poster: scene.poster?.trim() || undefined,
    kicker: scene.kicker.trim(),
    title: scene.title?.trim() || undefined,
    body: scene.body.trim(),
    credit: scene.credit?.trim() || undefined,
    source_url: scene.source_url?.trim() || undefined,
    audio_url: scene.audio_url?.trim() || undefined,
    mute_video: scene.mute_video,
  })))

const previewRelic = computed<Relic>(() => ({
  id: draft.id || 'preview',
  name: draft.name || t('preview.unnamed'),
  mission: draft.mission || '—',
  tagline: draft.tagline || t('preview.noTagline'),
  body: draft.body,
  facts: draft.facts.filter(fact => fact.label.trim() && fact.value.trim()),
  image: draft.image,
  alt: draft.alt,
  ratio: draft.ratio || '1376 / 768',
  // sem cenas, mostra a capa escolhida (se houver) para o modal não ficar vazio
  scenes: previewScenes.value.length > 0
    ? previewScenes.value
    : draft.image.trim()
      ? [{
          kind: 'image' as const,
          src: draft.image.trim(),
          kicker: t('form.cover'),
          body: draft.body || '',
        }]
      : [],
  steps: [],
  total_steps: 0,
  published: draft.published,
  status: draft.status,
  location: draft.location,
  intro_audio_url: draft.intro_audio_url.trim() || undefined,
}))

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

let idTouched = false

watch(
  () => props.open,
  (open) => {
    if (!open) return
    translationSaved.value = false
    quizOpen.value = false
    Object.assign(draft, blank())
    if (props.relic) {
      Object.assign(draft, JSON.parse(JSON.stringify(props.relic)))
      draft.status = props.relic.status ?? 'active'
      draft.location = props.relic.location ?? 'moon'
      draft.intro_audio_url = props.relic.intro_audio_url ?? ''
      draft.reference_url = props.relic.reference_url ?? ''
      draft.is_extra = props.relic.is_extra ?? false
      draft.scenes = props.relic.scenes.map(scene => ({
        ...scene,
        title: scene.title ?? '',
        credit: scene.credit ?? '',
        source_url: scene.source_url ?? '',
        audio_url: scene.audio_url ?? '',
      }))
    }
    // criar: o identificador segue o nome. editar: o identificador fica estável.
    idTouched = Boolean(props.relic)
    clearErrors()
  },
  { immediate: true },
)

function clearErrors(): void {
  for (const key of Object.keys(errors)) errors[key] = ''
}

function onName(): void {
  if (!idTouched) draft.id = slugify(draft.name)
}

function addFact(): void {
  draft.facts.push({ label: '', value: '' })
}

function addScene(kind: 'image' | 'video' = 'image'): void {
  draft.scenes.push(emptyScene(kind))
}

function removeScene(index: number): void {
  const scene = draft.scenes[index]
  if (!scene) return
  if (scene.src.trim() && !window.confirm(`Remover a cena ${index + 1}?`)) return
  draft.scenes.splice(index, 1)
}

function moveScene(index: number, direction: -1 | 1): void {
  const target = index + direction
  if (target < 0 || target >= draft.scenes.length) return
  const [scene] = draft.scenes.splice(index, 1)
  if (scene) draft.scenes.splice(target, 0, scene)
}

let dragIndex = -1

function onDragStart(index: number, event: DragEvent): void {
  dragIndex = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDrop(index: number): void {
  const from = dragIndex
  dragIndex = -1
  if (from < 0 || from === index) return
  const [scene] = draft.scenes.splice(from, 1)
  if (scene) draft.scenes.splice(index, 0, scene)
}

function isCover(scene: RelicScene): boolean {
  const image = draft.image.trim()
  if (!image) return false
  return scene.src.trim() === image || (scene.poster?.trim() ?? '') === image
}

function setCover(scene: RelicScene): void {
  const source = scene.kind === 'video' ? (scene.poster?.trim() ?? '') : scene.src.trim()
  if (!source) {
    errors.image = scene.kind === 'video'
      ? t('form.errCoverVideo')
      : t('form.errCoverImage')
    return
  }
  errors.image = ''
  draft.image = source
}

function onImageLoad(event: Event): void {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) draft.ratio = `${img.naturalWidth} / ${img.naturalHeight}`
}

const uploadIndex = ref(-1)
const uploadProgress = ref(0)
const coverProgress = ref(0)

const safeRelicId = (): string =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id) ? draft.id : 'common'

/** Envia a imagem de cartão; a capa tem de ser uma das cenas. */
async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  errors.image = ''
  coverProgress.value = 1
  try {
    const url = await uploadToStorage(file, 'image', safeRelicId(), value => { coverProgress.value = value })
    draft.image = url
    const empty = draft.scenes.find(scene => scene.kind === 'image' && !scene.src.trim())
    if (empty) empty.src = url

    const image = new Image()
    image.addEventListener('load', () => {
      if (image.naturalWidth && image.naturalHeight) {
        draft.ratio = `${image.naturalWidth} / ${image.naturalHeight}`
      }
    })
    image.src = url
  }
  catch (err: unknown) {
    errors.image = err instanceof Error ? err.message : t('form.errImage')
  }
  finally {
    coverProgress.value = 0
    input.value = ''
  }
}

async function onSceneFile(event: Event, index: number): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const scene = draft.scenes[index]
  if (!file || !scene) return

  errors.scenes = ''
  uploadIndex.value = index
  uploadProgress.value = 1
  try {
    const url = await uploadToStorage(
      file,
      scene.kind === 'video' ? 'video' : 'image',
      safeRelicId(),
      value => { uploadProgress.value = value },
    )
    scene.src = url
  }
  catch (err: unknown) {
    errors.scenes = err instanceof Error ? err.message : t('form.errScenes')
  }
  finally {
    uploadIndex.value = -1
    uploadProgress.value = 0
    input.value = ''
  }
}

function collect(): { facts: RelicFact[], scenes: RelicScene[] } {
  return {
    facts: draft.facts
      .filter(fact => fact.label.trim() && fact.value.trim())
      .map(fact => ({ label: fact.label.trim(), value: fact.value.trim() })),
    scenes: draft.scenes
      .filter(scene => scene.src.trim() && scene.body.trim())
      .map(scene => ({
        kind: scene.kind,
        src: scene.src.trim(),
        poster: scene.poster?.trim() || undefined,
        kicker: scene.kicker.trim(),
        title: scene.title?.trim() || undefined,
        body: scene.body.trim(),
        credit: scene.credit?.trim() || undefined,
        source_url: scene.source_url?.trim() || undefined,
        audio_url: scene.audio_url?.trim() || undefined,
        mute_video: scene.mute_video !== false,
      })),
  }
}

function validate(): boolean {
  clearErrors()
  const required: Array<[keyof Draft, string]> = [
    ['name', t('form.errName')],
    ['mission', t('form.errMission')],
    ['tagline', t('form.errTagline')],
    ['body', t('form.errBody')],
    ['image', t('form.errImage')],
    ['alt', t('form.errAlt')],
  ]
  for (const [key, message] of required) {
    if (!String(draft[key] ?? '').trim()) errors[key] = message
  }
  if (!/^[a-z0-9-]+$/.test(draft.id)) errors.id = t('form.errSlug')
  else if (props.takenIds.includes(draft.id)) errors.id = t('form.errSlugTaken')

  const { facts, scenes } = collect()
  if (facts.length < 1) errors.facts = t('form.errFacts')
  if (scenes.length < 1) errors.scenes = t('form.errScenes')
  if (
    !errors.image
    && draft.image.trim()
    && scenes.length > 0
    && !scenes.some(scene => scene.src === draft.image.trim() || scene.poster === draft.image.trim())
  ) {
    errors.image = t('form.errCover')
  }

  return Object.values(errors).every(message => !message)
}

function save(): void {
  if (!validate()) return
  const { facts, scenes } = collect()
  emit('save', {
    slug: draft.id,
    name: draft.name.trim(),
    mission: draft.mission.trim(),
    tagline: draft.tagline.trim(),
    body: draft.body.trim(),
    image: draft.image.trim(),
    alt: draft.alt.trim(),
    ratio: draft.ratio.trim() || '1376 / 768',
    status: draft.status,
    location: draft.location,
    published: draft.published,
    intro_audio_url: draft.intro_audio_url.trim() || undefined,
    reference_url: draft.reference_url.trim() || undefined,
    is_extra: draft.is_extra,
    facts,
    scenes,
  })
}

function requestClose(): void {
  emit('close')
}

/** FE-21: Esc fecha e Tab fica dentro do diálogo (como no modal público). */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    requestClose()
    return
  }
  if (event.key !== 'Tab') return
  const root = document.querySelector<HTMLElement>('.rform__sheet')
  if (!root) return
  const items = Array.from(
    root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  ).filter(el => el.offsetParent !== null)
  if (items.length === 0) return
  const first = items[0] as HTMLElement
  const last = items[items.length - 1] as HTMLElement
  const active = document.activeElement as HTMLElement | null
  if (event.shiftKey && (active === first || active === null || !items.includes(active))) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && (active === last || active === null || !items.includes(active))) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  (open) => {
    if (typeof window === 'undefined') return
    if (open) {
      window.addEventListener('keydown', onKeydown)
      void nextTick(() => document.querySelector<HTMLElement>('.rform__sheet input')?.focus())
    }
    else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.rform {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: center;
  padding: 24px;
}

.rform__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: color-mix(in srgb, #03040a 88%, transparent);
  backdrop-filter: blur(14px) saturate(0.6);
  cursor: default;
}

.rform__sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(1240px, 100%);
  max-height: min(92vh, 1080px);
  color: var(--fr-fg, #e8e6e1);
  background:
    radial-gradient(80% 40% at 50% -6%, color-mix(in srgb, var(--accent, #7aa2ff) 14%, transparent), transparent 72%),
    #070910;
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: 0 60px 160px rgb(0 0 0 / 72%);
}

.rform__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 34px 44px 26px;
}

.rform__kicker {
  margin: 0 0 8px;
  font-size: 9px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.45;
}

.rform__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(30px, 3.4vw, 44px);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 0.94;
}

.rform__saveTranslation {
  align-self: flex-start;
  margin-top: 4px;
  padding: 10px 16px;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #06070c;
  background: var(--fr-fg, #e8e6e1);
  border: 1px solid transparent;
  opacity: 1;
}

.rform__saveTranslation:disabled { opacity: 0.35; cursor: not-allowed; }
.rform__saveTranslation:hover:not(:disabled) { filter: brightness(1.06); background: var(--fr-fg, #e8e6e1); }

.rform__headActions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rform__previewBtn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 44px;
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 22px;
  cursor: pointer;
  transition: background 0.25s ease, border-color 0.25s ease;
}

.rform__previewBtn svg {
  width: 18px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
}

.rform__previewBtn:hover { background: rgb(255 255 255 / 7%); }

.rform__previewBtn[aria-pressed="true"] {
  background: rgb(255 255 255 / 12%);
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 65%, transparent);
}

.rform__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  opacity: 0.75;
  cursor: pointer;
}

.rform__check input {
  width: 14px;
  height: 14px;
  accent-color: #f5f3ee;
}

.rform__warn {
  margin: 0;
  padding: 8px 10px;
  font-size: 10.5px;
  line-height: 1.4;
  color: #f5d58a;
  background: rgb(245 213 138 / 8%);
  border-left: 2px solid rgb(245 213 138 / 55%);
}

.rform__x {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.25s ease, transform 0.35s ease;
}

.rform__x svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.2; }
.rform__x:hover { background: rgb(255 255 255 / 8%); transform: rotate(90deg); }

.rform__body {
  display: flex;
  flex-direction: column;
  padding: 0 44px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.rform__body::-webkit-scrollbar { width: 0; height: 0; }

.rform__group {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 28px;
  padding: 30px 0;
  border-top: 1px solid rgb(255 255 255 / 8%);
  align-items: start;
}

.rform__groupHead {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rform__num {
  font-family: var(--fr-serif, inherit);
  font-size: 34px;
  line-height: 0.8;
  opacity: 0.22;
}

.rform__legend {
  margin: 0;
  font-size: 9.5px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.7;
}

.rform__legend em,
.rform__label em {
  font-style: normal;
  text-transform: none;
  letter-spacing: 0.02em;
  opacity: 0.6;
}

.rform__add {
  align-self: flex-start;
  margin-top: 2px;
  padding: 6px 10px;
  color: inherit;
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  opacity: 0.7;
  cursor: pointer;
}

.rform__add:hover { opacity: 1; background: rgb(255 255 255 / 6%); }

.rform__groupBody {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.rform__pairRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.rform__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.rform__label {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.5;
}

.rform__input {
  width: 100%;
  padding: 12px 14px;
  font: inherit;
  font-size: 13.5px;
  color: inherit;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 11%);
  border-radius: 3px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.rform__input:focus-visible {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 60%, transparent);
  background: rgb(255 255 255 / 6%);
}

.rform__input--mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }

.rform__area { resize: vertical; min-height: 92px; line-height: 1.55; }

.rform__err { font-size: 11px; line-height: 1.35; color: #ff9a9a; }

.rform__media {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.rform__thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 11%);
  border-radius: 3px;
}

.rform__thumb img { width: 100%; height: 100%; object-fit: cover; }

.rform__thumbEmpty {
  font-size: 8.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.3;
}

.rform__upload {
  position: absolute;
  inset: auto 8px 8px auto;
  padding: 7px 10px;
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: inherit;
  background: rgb(4 6 12 / 80%);
  border: 1px solid rgb(255 255 255 / 18%);
  backdrop-filter: blur(6px);
  cursor: pointer;
}

.rform__upload:hover { background: rgb(255 255 255 / 12%); }

.rform__mediaFields { display: flex; flex-direction: column; gap: 14px; }

.rform__factRow {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) 38px;
  gap: 10px;
  align-items: center;
}

.rform__del {
  display: grid;
  place-items: center;
  height: 100%;
  min-height: 38px;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 3px;
  opacity: 0.45;
  cursor: pointer;
  transition: opacity 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.rform__del svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 1.3; }
.rform__del:hover { opacity: 1; border-color: #ff9a9a; color: #ff9a9a; }

.rform__scene {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 4px;
  background: linear-gradient(180deg, rgb(255 255 255 / 2.5%), transparent);
}

.rform__sceneHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.rform__sceneNum {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.5;
}

.rform__sceneTools { display: flex; align-items: center; gap: 8px; }

.rform__segment {
  display: inline-flex;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 3px;
  overflow: hidden;
}

.rform__segment button {
  padding: 6px 12px;
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 0;
  opacity: 0.45;
  cursor: pointer;
}

.rform__segment button.is-on {
  background: rgb(255 255 255 / 12%);
  opacity: 1;
}

.rform__segment .rform__del,
.rform__sceneTools .rform__del { min-height: 28px; width: 28px; }

.rform__foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 44px 26px;
  border-top: 1px solid rgb(255 255 255 / 10%);
  background: linear-gradient(to top, #06080f 40%, transparent);
}

.rform__footNote { margin: 0; font-size: 9.5px; letter-spacing: 0.08em; opacity: 0.32; }

.rform__publish {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.75;
  cursor: pointer;
}

.rform__publish input {
  width: 13px;
  height: 13px;
  accent-color: var(--accent, #7aa2ff);
  cursor: pointer;
}

.rform__actions { display: flex; gap: 10px; margin-left: auto; }

.rform__cancel {
  padding: 13px 20px;
  font-size: 9.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 3px;
  cursor: pointer;
}

.rform__cancel:hover { background: rgb(255 255 255 / 6%); }

.rform__save {
  padding: 13px 24px;
  font-size: 9.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #06070c;
  background: var(--fr-fg, #e8e6e1);
  border: 0;
  border-radius: 3px;
  cursor: pointer;
}

.rform__save:hover { filter: brightness(1.08); }

.form-enter-active, .form-leave-active { transition: opacity 0.3s ease; }
.form-enter-from, .form-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .rform__group { grid-template-columns: 1fr; gap: 14px; }
  .rform__groupHead { flex-direction: row; align-items: center; gap: 14px; position: static; }
  .rform__num { font-size: 24px; }
  .rform__media { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .rform { padding: 12px; }
  .rform__body { padding: 0 20px 8px; }
  .rform__head { padding: 24px 20px 18px; }
  .rform__foot { padding: 16px 20px 20px; flex-wrap: wrap; }
  .rform__footNote { display: none; }
  .rform__pairRow { grid-template-columns: 1fr; }
  .rform__factRow { grid-template-columns: 1fr 38px; }
  .rform__factRow .rform__input:nth-child(2) { grid-column: 1; }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* FE-14 — gestor de mídias */
.rform__addRow {
  display: flex;
  gap: 8px;
}

.rform__cover,
.rform__move {
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  background: none;
  color: inherit;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.rform__move {
  min-width: 28px;
  padding: 4px 6px;
  font-size: 13px;
}

.rform__cover.is-on {
  border-color: var(--accent, #7aa2ff);
  background: color-mix(in srgb, var(--accent, #7aa2ff) 24%, transparent);
}

.rform__coverRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.rform__coverHint {
  font-size: 11px;
  opacity: 0.55;
}

.rform__hint {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  opacity: 0.5;
}

.rform__cover:disabled,
.rform__move:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.rform__cover:focus-visible,
.rform__move:focus-visible,
.rform__grab:focus-visible {
  outline: 2px solid var(--accent, #7aa2ff);
  outline-offset: 2px;
}

.rform__grab {
  cursor: grab;
  opacity: 0.4;
  font-size: 15px;
  line-height: 1;
  user-select: none;
}

.rform__scene:active .rform__grab {
  cursor: grabbing;
}

.rform__scene.is-cover {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 55%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent, #7aa2ff) 28%, transparent);
}

.rform__coverTag {
  margin-left: 8px;
  color: var(--accent, #7aa2ff);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-style: normal;
}

.rform__sceneGrid {
  display: grid;
  grid-template-columns: minmax(0, 200px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.rform__scenePreview {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 8px;
  background: rgb(255 255 255 / 2%);
}

.rform__scenePreview img,
.rform__scenePreview video {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 6px;
  background: #000;
}

/* Nos cartões de mídia o botão vive no fluxo, por baixo da pré-visualização. */
.rform__scenePreview .rform__upload {
  position: static;
  justify-self: stretch;
  width: 100%;
  padding: 7px 8px;
  text-align: center;
}

.rform__sceneFields {
  display: grid;
  gap: 10px;
}

.rform__progress {
  position: relative;
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 10%);
}

.rform__progress span {
  display: block;
  height: 100%;
  width: 0;
  background: var(--accent, #7aa2ff);
  transition: width 0.15s linear;
}

@media (max-width: 900px) {
  .rform__sceneGrid { grid-template-columns: 1fr; }
  .rform__scenePreview { max-width: 220px; }
}
</style>
