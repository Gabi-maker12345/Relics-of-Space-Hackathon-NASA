<template>
  <Teleport to="body">
    <Transition name="form">
      <div v-if="open" class="rform" role="dialog" aria-modal="true" aria-labelledby="rform-title">
        <button class="rform__scrim" type="button" aria-label="Fechar" @click="requestClose" />

        <form class="rform__sheet" novalidate @submit.prevent="save">
          <header class="rform__head">
            <div class="rform__headText">
              <p class="rform__kicker">{{ isEdit ? 'Registo existente' : 'Novo registo' }}</p>
              <h2 id="rform-title" class="rform__title">{{ isEdit ? 'Editar relíquia' : 'Nova relíquia' }}</h2>
            </div>
            <button type="button" class="rform__x" aria-label="Fechar" @click="requestClose">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
            </button>
          </header>

          <div class="rform__body" data-lenis-prevent>
            <section class="rform__group">
              <div class="rform__groupHead">
                <span class="rform__num">01</span>
                <h3 class="rform__legend">Identidade</h3>
              </div>

              <div class="rform__groupBody">
                <div class="rform__pairRow">
                  <label class="rform__field rform__field--wide">
                    <span class="rform__label">Nome da relíquia</span>
                    <input v-model="draft.name" class="rform__input" placeholder="Módulo Lunar Apollo" @input="onName">
                    <span v-if="errors.name" class="rform__err">{{ errors.name }}</span>
                  </label>
                  <label class="rform__field">
                    <span class="rform__label">Identificador <em>(URL)</em></span>
                    <input v-model="draft.id" class="rform__input rform__input--mono" placeholder="apollo-lunar-module">
                    <span v-if="errors.id" class="rform__err">{{ errors.id }}</span>
                  </label>
                </div>

                <div class="rform__pairRow">
                  <label class="rform__field">
                    <span class="rform__label">Missão</span>
                    <input v-model="draft.mission" class="rform__input" placeholder="Apollo 11–17 · 1969–1972">
                    <span v-if="errors.mission" class="rform__err">{{ errors.mission }}</span>
                  </label>
                  <label class="rform__field">
                    <span class="rform__label">Frase de efeito</span>
                    <input v-model="draft.tagline" class="rform__input" placeholder="Seis pousos, seis módulos deixados para trás.">
                    <span v-if="errors.tagline" class="rform__err">{{ errors.tagline }}</span>
                  </label>
                </div>

                <div class="rform__pairRow">
                  <label class="rform__field">
                    <span class="rform__label">Estado</span>
                    <select v-model="draft.status" class="rform__input">
                      <option value="active">Activo</option>
                      <option value="silent">Silencioso</option>
                      <option value="lost">Perdido</option>
                    </select>
                  </label>
                  <label class="rform__field">
                    <span class="rform__label">Local</span>
                    <select v-model="draft.location" class="rform__input">
                      <option value="moon">Lua</option>
                      <option value="mars">Marte</option>
                      <option value="deep_space">Espaço profundo</option>
                    </select>
                  </label>
                </div>

                <label class="rform__field">
                  <span class="rform__label">História</span>
                  <textarea v-model="draft.body" class="rform__input rform__area" rows="4" placeholder="O que ficou para trás, contado em duas ou três frases." />
                  <span v-if="errors.body" class="rform__err">{{ errors.body }}</span>
                </label>

                <label class="rform__field">
                  <span class="rform__label">Áudio de introdução <em>(opcional)</em></span>
                  <input v-model="draft.intro_audio_url" class="rform__input rform__input--mono" placeholder="/media/intro.mp3">
                </label>
              </div>
            </section>

            <section class="rform__group">
              <div class="rform__groupHead">
                <span class="rform__num">02</span>
                <h3 class="rform__legend">Cartão</h3>
              </div>

              <div class="rform__groupBody">
                <div class="rform__media">
                  <div class="rform__thumb">
                    <img v-if="draft.image" :src="draft.image" :alt="draft.alt || 'Pré-visualização'" @load="onImageLoad">
                    <span v-else class="rform__thumbEmpty">sem imagem</span>
                    <label class="rform__upload">
                      <input type="file" accept="image/*" class="sr-only" @change="onFile">
                      <span>{{ draft.image ? 'Substituir' : 'Enviar imagem' }}</span>
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
                      <span class="rform__label">Imagem <em>(URL ou ficheiro)</em></span>
                      <input v-model="draft.image" class="rform__input rform__input--mono" placeholder="/images/relics/nova.jpg">
                      <span v-if="errors.image" class="rform__err">{{ errors.image }}</span>
                    </label>

                    <div class="rform__pairRow">
                      <label class="rform__field">
                        <span class="rform__label">Texto alternativo</span>
                        <input v-model="draft.alt" class="rform__input" placeholder="Descrição da imagem">
                        <span v-if="errors.alt" class="rform__err">{{ errors.alt }}</span>
                      </label>
                      <label class="rform__field">
                        <span class="rform__label">Proporção <em>(automática)</em></span>
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
                <h3 class="rform__legend">Ficha técnica</h3>
                <button type="button" class="rform__add" @click="addFact">+ linha</button>
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
                <h3 class="rform__legend">Mídias <em>(narradas)</em></h3>
                <div class="rform__addRow">
                  <button type="button" class="rform__add" @click="addScene('image')">+ imagem</button>
                  <button type="button" class="rform__add" @click="addScene('video')">+ vídeo</button>
                </div>
              </div>

              <div class="rform__groupBody">
                <article
                  v-for="(scene, i) in draft.scenes"
                  :key="`scene-${i}`"
                  class="rform__scene"
                  :class="{ 'is-cover': isCover(scene) }"
                  draggable="true"
                  @dragstart="onDragStart(i, $event)"
                  @dragover.prevent
                  @drop.prevent="onDrop(i)"
                >
                  <header class="rform__sceneHead">
                    <span class="rform__sceneNum">
                      Cena {{ String(i + 1).padStart(2, '0') }} · {{ scene.kind === 'video' ? 'vídeo' : 'imagem' }}
                      <em v-if="isCover(scene)" class="rform__coverTag">capa</em>
                    </span>
                    <div class="rform__sceneTools">
                      <button
                        type="button"
                        class="rform__cover"
                        :class="{ 'is-on': isCover(scene) }"
                        :aria-pressed="isCover(scene)"
                        @click="setCover(scene)"
                      >
                        {{ isCover(scene) ? 'É capa' : 'Definir capa' }}
                      </button>
                      <button type="button" class="rform__move" :disabled="i === 0" aria-label="Subir cena" @click="moveScene(i, -1)">↑</button>
                      <button type="button" class="rform__move" :disabled="i === draft.scenes.length - 1" aria-label="Descer cena" @click="moveScene(i, 1)">↓</button>
                      <span class="rform__grab" aria-hidden="true" title="Arrastar para reordenar">⠿</span>
                      <div class="rform__segment" role="group" aria-label="Tipo de mídia">
                        <button type="button" :class="{ 'is-on': scene.kind === 'image' }" @click="scene.kind = 'image'">Imagem</button>
                        <button type="button" :class="{ 'is-on': scene.kind === 'video' }" @click="scene.kind = 'video'">Vídeo</button>
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
                        <span>{{ scene.src ? 'Substituir' : 'Enviar ficheiro' }}</span>
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
                        <span class="rform__label">URL do {{ scene.kind === 'video' ? 'vídeo' : 'imagem' }}</span>
                        <input v-model="scene.src" class="rform__input rform__input--mono" placeholder="/media/loop.mp4">
                      </label>

                      <div class="rform__pairRow">
                        <label class="rform__field">
                          <span class="rform__label">Título <em>(opcional)</em></span>
                          <input v-model="scene.title" class="rform__input" placeholder="Descida do módulo">
                        </label>
                        <label class="rform__field">
                          <span class="rform__label">Etiqueta</span>
                          <input v-model="scene.kicker" class="rform__input" placeholder="Fotografia / Transmissão">
                        </label>
                      </div>

                      <label v-if="scene.kind === 'video'" class="rform__field">
                        <span class="rform__label">Poster do vídeo</span>
                        <input v-model="scene.poster" class="rform__input rform__input--mono" placeholder="/images/relics/poster.jpg">
                      </label>

                      <label class="rform__field">
                        <span class="rform__label">Legenda / transcrição</span>
                        <textarea v-model="scene.body" class="rform__input rform__area" rows="3" placeholder="O que o diário conta nesta cena." />
                      </label>

                      <div class="rform__pairRow">
                        <label class="rform__field">
                          <span class="rform__label">Crédito</span>
                          <input v-model="scene.credit" class="rform__input" placeholder="NASA / JPL">
                        </label>
                        <label class="rform__field">
                          <span class="rform__label">Fonte <em>(URL)</em></span>
                          <input v-model="scene.source_url" class="rform__input rform__input--mono" placeholder="https://images.nasa.gov/…">
                        </label>
                      </div>

                      <label class="rform__field">
                        <span class="rform__label">Áudio narrado <em>(opcional)</em></span>
                        <input v-model="scene.audio_url" class="rform__input rform__input--mono" placeholder="/media/narracao.mp3">
                      </label>
                    </div>
                  </div>
                </article>
                <span v-if="errors.scenes" class="rform__err">{{ errors.scenes }}</span>
              </div>
            </section>
          </div>

          <footer class="rform__foot">
            <p class="rform__footNote">Guardado na base de dados.</p>
            <label class="rform__publish">
              <input v-model="draft.published" type="checkbox">
              <span>Publicada no arquivo</span>
            </label>
            <span v-if="errors.general" class="rform__err">{{ errors.general }}</span>
            <div class="rform__actions">
              <button type="button" class="rform__cancel" @click="requestClose">Cancelar</button>
              <button type="submit" class="rform__save">{{ isEdit ? 'Guardar alterações' : 'Criar relíquia' }}</button>
            </div>
          </footer>
        </form>
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
  }
}

const draft = reactive<Draft>(blank())
const errors = reactive<Record<string, string>>({})

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
    Object.assign(draft, blank())
    if (props.relic) {
      Object.assign(draft, JSON.parse(JSON.stringify(props.relic)))
      draft.status = props.relic.status ?? 'active'
      draft.location = props.relic.location ?? 'moon'
      draft.intro_audio_url = props.relic.intro_audio_url ?? ''
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
      ? 'Preenche o poster para usar este vídeo como capa.'
      : 'Esta cena ainda não tem imagem.'
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

/**
 * Upload direto com progresso real (`xhr.upload.onprogress`). O endpoint aceita
 * até 4 MB; acima disso é preciso o fluxo de signed URL.
 */
function uploadToStorage(
  file: File,
  kind: 'image' | 'video' | 'audio',
  onProgress: (value: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    form.append('relicId', safeRelicId())

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/admin/upload')
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    })
    xhr.addEventListener('load', () => {
      let payload: { url?: string, message?: string } = {}
      try {
        payload = JSON.parse(xhr.responseText) as { url?: string, message?: string }
      }
      catch {
        /* resposta sem JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.url) resolve(payload.url)
      else reject(new Error(payload.message || `Falha no upload (${xhr.status}).`))
    })
    xhr.addEventListener('error', () => reject(new Error('Falha de rede no upload.')))
    xhr.send(form)
  })
}

/** Envia a imagem de cartão; a capa tem de ser uma das cenas. */
async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  errors.image = ''
  coverProgress.value = 1
  try {
    const url = await uploadToStorage(file, 'image', value => { coverProgress.value = value })
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
    errors.image = err instanceof Error ? err.message : 'Falha ao enviar a imagem.'
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
      value => { uploadProgress.value = value },
    )
    scene.src = url
  }
  catch (err: unknown) {
    errors.scenes = err instanceof Error ? err.message : 'Falha ao enviar a mídia.'
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
      })),
  }
}

function validate(): boolean {
  clearErrors()
  const required: Array<[keyof Draft, string]> = [
    ['name', 'Dá um nome à relíquia.'],
    ['mission', 'Indica a missão.'],
    ['tagline', 'Escreve a frase de efeito.'],
    ['body', 'Falta a história.'],
    ['image', 'Falta a imagem do cartão.'],
    ['alt', 'Falta o texto alternativo.'],
  ]
  for (const [key, message] of required) {
    if (!String(draft[key] ?? '').trim()) errors[key] = message
  }
  if (!/^[a-z0-9-]+$/.test(draft.id)) errors.id = 'Só minúsculas, números e hífens.'
  else if (props.takenIds.includes(draft.id)) errors.id = 'Já existe uma relíquia com este identificador.'

  const { facts, scenes } = collect()
  if (facts.length < 1) errors.facts = 'Preenche pelo menos uma linha da ficha.'
  if (scenes.length < 1) errors.scenes = 'Cada cena precisa de mídia e texto narrado.'
  if (
    !errors.image
    && draft.image.trim()
    && scenes.length > 0
    && !scenes.some(scene => scene.src === draft.image.trim() || scene.poster === draft.image.trim())
  ) {
    errors.image = 'A imagem do cartão tem de ser uma das cenas.'
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
    facts,
    scenes,
  })
}

function requestClose(): void {
  emit('close')
}
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
