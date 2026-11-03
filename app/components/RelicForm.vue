<template>
  <Teleport to="body">
    <Transition name="form">
      <div v-if="open" class="rform" role="dialog" aria-modal="true" aria-labelledby="rform-title">
        <button class="rform__scrim" type="button" aria-label="Fechar" @click="requestClose" />

        <form class="rform__sheet" novalidate @submit.prevent="save">
          <header class="rform__head">
            <div>
              <p class="rform__kicker">{{ isEdit ? 'Registo existente' : 'Novo registo' }}</p>
              <h2 id="rform-title" class="rform__title">{{ isEdit ? 'Editar relíquia' : 'Nova relíquia' }}</h2>
            </div>
            <button type="button" class="rform__x" aria-label="Fechar" @click="requestClose">✕</button>
          </header>

          <div class="rform__body">
            <section class="rform__group">
              <h3 class="rform__legend">Identidade</h3>

              <label class="rform__field">
                <span class="rform__label">Nome da relíquia</span>
                <input v-model="draft.name" class="rform__input" placeholder="Módulo Lunar Apollo" @input="onName">
                <span v-if="errors.name" class="rform__err">{{ errors.name }}</span>
              </label>

              <label class="rform__field">
                <span class="rform__label">Identificador <em>(usado no URL)</em></span>
                <input v-model="draft.id" class="rform__input rform__input--mono" placeholder="apollo-lunar-module">
                <span v-if="errors.id" class="rform__err">{{ errors.id }}</span>
              </label>

              <div class="rform__row">
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

              <label class="rform__field">
                <span class="rform__label">História</span>
                <textarea v-model="draft.body" class="rform__input rform__area" rows="4" placeholder="O que ficou para trás, contado em duas ou três frases." />
                <span v-if="errors.body" class="rform__err">{{ errors.body }}</span>
              </label>
            </section>

            <section class="rform__group">
              <h3 class="rform__legend">Cartão</h3>

              <div class="rform__media">
                <div class="rform__thumb">
                  <img v-if="draft.image" :src="draft.image" :alt="draft.alt || 'Pré-visualização'" @load="onImageLoad">
                  <span v-else class="rform__thumbEmpty">sem imagem</span>
                </div>

                <div class="rform__mediaFields">
                  <label class="rform__field">
                    <span class="rform__label">Imagem (URL ou ficheiro)</span>
                    <input v-model="draft.image" class="rform__input rform__input--mono" placeholder="/images/relics/nova.jpg">
                    <span v-if="errors.image" class="rform__err">{{ errors.image }}</span>
                  </label>
                  <label class="rform__upload">
                    <input type="file" accept="image/*" class="sr-only" @change="onFile">
                    <span>Enviar imagem</span>
                  </label>

                  <label class="rform__field">
                    <span class="rform__label">Texto alternativo <em>(acessibilidade)</em></span>
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
            </section>

            <section class="rform__group">
              <div class="rform__legendRow">
                <h3 class="rform__legend">Ficha técnica</h3>
                <button type="button" class="rform__add" @click="addFact">+ acrescentar linha</button>
              </div>

              <div v-for="(fact, i) in draft.facts" :key="`fact-${i}`" class="rform__pair">
                <input v-model="fact.label" class="rform__input" placeholder="Rótulo (ex.: Primeiro pouso)">
                <input v-model="fact.value" class="rform__input" placeholder="Valor (ex.: 20 jul 1969)">
                <button type="button" class="rform__del" :aria-label="`Remover linha ${i + 1}`" @click="draft.facts.splice(i, 1)">✕</button>
              </div>
              <span v-if="errors.facts" class="rform__err">{{ errors.facts }}</span>
            </section>

            <section class="rform__group">
              <div class="rform__legendRow">
                <h3 class="rform__legend">Cenas <em>(as que o robô narra)</em></h3>
                <button type="button" class="rform__add" @click="addScene">+ acrescentar cena</button>
              </div>

              <article v-for="(scene, i) in draft.scenes" :key="`scene-${i}`" class="rform__scene">
                <header class="rform__sceneHead">
                  <span class="rform__sceneNum">Cena {{ String(i + 1).padStart(2, '0') }}</span>
                  <button
                    v-if="draft.scenes.length > 1"
                    type="button"
                    class="rform__del"
                    :aria-label="`Remover cena ${i + 1}`"
                    @click="draft.scenes.splice(i, 1)"
                  >✕</button>
                </header>

                <div class="rform__row">
                  <label class="rform__field">
                    <span class="rform__label">Tipo</span>
                    <select v-model="scene.kind" class="rform__input">
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                    </select>
                  </label>
                  <label class="rform__field">
                    <span class="rform__label">Etiqueta</span>
                    <input v-model="scene.kicker" class="rform__input" placeholder="Fotografia / Transmissão">
                  </label>
                </div>

                <label class="rform__field">
                  <span class="rform__label">{{ scene.kind === 'video' ? 'Vídeo' : 'Imagem' }} (URL ou ficheiro)</span>
                  <input v-model="scene.src" class="rform__input rform__input--mono" placeholder="/media/loop.mp4">
                </label>

                <label v-if="scene.kind === 'video'" class="rform__field">
                  <span class="rform__label">Poster do vídeo</span>
                  <input v-model="scene.poster" class="rform__input rform__input--mono" placeholder="/images/relics/poster.jpg">
                </label>

                <label class="rform__field">
                  <span class="rform__label">Texto narrado</span>
                  <textarea v-model="scene.body" class="rform__input rform__area" rows="3" placeholder="O que o diário conta nesta cena." />
                </label>
                <span v-if="errors.scenes" class="rform__err">{{ errors.scenes }}</span>
              </article>
            </section>
          </div>

          <footer class="rform__foot">
            <p v-if="errors.general" class="rform__err">{{ errors.general }}</p>
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
import type { Relic, RelicFact, RelicScene } from '~/data/relics'

const props = defineProps<{
  open: boolean
  relic: Relic | null
  takenIds: string[]
}>()

const emit = defineEmits<{
  close: []
  save: [relic: Relic]
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
  facts: [
    { label: '', value: '' },
    { label: '', value: '' },
    { label: '', value: '' },
    { label: '', value: '' },
  ],
  scenes: [emptyScene('image')],
})

function emptyScene(kind: 'image' | 'video'): RelicScene {
  return { kind, src: '', poster: '', kicker: kind === 'video' ? 'Transmissão' : 'Fotografia', body: '' }
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
    Object.assign(draft, props.relic ? JSON.parse(JSON.stringify(props.relic)) : {})
    // criar: o identificador segue o nome. editar: o identificador fica estável.
    idTouched = Boolean(props.relic)
    errors.general = ''
    for (const key of Object.keys(errors)) delete errors[key]
  },
  { immediate: true },
)

function onName(): void {
  if (!idTouched) draft.id = slugify(draft.name)
}

function addFact(): void {
  draft.facts.push({ label: '', value: '' })
}

function addScene(): void {
  draft.scenes.push(emptyScene(draft.scenes.at(-1)?.kind === 'video' ? 'video' : 'image'))
}

function onImageLoad(event: Event): void {
  const img = event.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) draft.ratio = `${img.naturalWidth} / ${img.naturalHeight}`
}

/** Converte o ficheiro numa data URL com largura máxima de 1280 px (cabe no localStorage). */
async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const bitmap = await createImageBitmap(file)
  const max = 1280
  const scale = Math.min(1, max / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  draft.image = canvas.toDataURL('image/jpeg', 0.82)
  draft.ratio = `${canvas.width} / ${canvas.height}`
  input.value = ''
}

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
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

  const facts = draft.facts.filter(fact => fact.label.trim() && fact.value.trim())
  if (facts.length < 1) errors.facts = 'Preenche pelo menos uma linha da ficha.'

  const scenes = draft.scenes.filter(scene => scene.src.trim() && scene.body.trim())
  if (scenes.length < 1) errors.scenes = 'Cada cena precisa de mídia e texto narrado.'

  return Object.keys(errors).length === 0
}

function save(): void {
  if (!validate()) return
  emit('save', {
    id: draft.id,
    name: draft.name.trim(),
    mission: draft.mission.trim(),
    tagline: draft.tagline.trim(),
    body: draft.body.trim(),
    image: draft.image.trim(),
    alt: draft.alt.trim(),
    ratio: draft.ratio.trim() || '1376 / 768',
    facts: draft.facts.filter(fact => fact.label.trim() && fact.value.trim()).map(fact => ({ label: fact.label.trim(), value: fact.value.trim() })),
    scenes: draft.scenes
      .filter(scene => scene.src.trim() && scene.body.trim())
      .map(scene => ({
        kind: scene.kind,
        src: scene.src.trim(),
        poster: scene.poster?.trim() || undefined,
        kicker: scene.kicker.trim(),
        body: scene.body.trim(),
      })),
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
  background: color-mix(in srgb, #03040a 86%, transparent);
  backdrop-filter: blur(12px) saturate(0.6);
  cursor: default;
}

.rform__sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(900px, 100%);
  max-height: min(88vh, 1000px);
  color: var(--fr-fg, #e8e6e1);
  background:
    radial-gradient(90% 50% at 50% -10%, color-mix(in srgb, var(--accent, #7aa2ff) 12%, transparent), transparent 70%),
    #070910;
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: 0 50px 140px rgb(0 0 0 / 70%);
}

.rform__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 30px 18px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.rform__kicker {
  margin: 0 0 6px;
  font-size: 9px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  opacity: 0.5;
}

.rform__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1;
}

.rform__x {
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  color: inherit;
  width: 32px;
  height: 32px;
  font-size: 12px;
  cursor: pointer;
}

.rform__body {
  padding: 24px 30px 8px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 26px;
  scrollbar-width: thin;
}

.rform__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rform__legendRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.rform__legend {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.6;
}

.rform__legend em,
.rform__label em {
  font-style: normal;
  text-transform: none;
  letter-spacing: 0.02em;
  opacity: 0.6;
}

.rform__add {
  background: none;
  border: 0;
  color: inherit;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.65;
  cursor: pointer;
}

.rform__add:hover { opacity: 1; }

.rform__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.rform__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rform__label {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.55;
}

.rform__input {
  width: 100%;
  padding: 11px 13px;
  font: inherit;
  font-size: 13px;
  color: inherit;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 2px;
  outline: none;
}

.rform__input:focus-visible {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 65%, transparent);
  background: rgb(255 255 255 / 7%);
}

.rform__input--mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }

.rform__area { resize: vertical; min-height: 84px; line-height: 1.5; }

.rform__err {
  font-size: 11px;
  color: #ff9a9a;
}

.rform__media {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 16px;
  align-items: start;
}

.rform__thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 12%);
}

.rform__thumb img { width: 100%; height: 100%; object-fit: cover; }

.rform__thumbEmpty {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.35;
}

.rform__mediaFields { display: flex; flex-direction: column; gap: 10px; }

.rform__upload {
  display: inline-flex;
  align-self: flex-start;
  padding: 8px 12px;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  border: 1px solid rgb(255 255 255 / 16%);
  cursor: pointer;
}

.rform__upload:hover { background: rgb(255 255 255 / 6%); }

.rform__pair {
  display: grid;
  grid-template-columns: 1fr 1fr 32px;
  gap: 8px;
}

.rform__del {
  background: none;
  border: 1px solid rgb(255 255 255 / 12%);
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  opacity: 0.6;
}

.rform__del:hover { opacity: 1; border-color: #ff9a9a; color: #ff9a9a; }

.rform__scene {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgb(255 255 255 / 10%);
  background: rgb(255 255 255 / 2%);
}

.rform__sceneHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rform__sceneNum {
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.5;
}

.rform__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 30px 24px;
  border-top: 1px solid rgb(255 255 255 / 8%);
}

.rform__actions { display: flex; gap: 10px; margin-left: auto; }

.rform__cancel {
  padding: 12px 18px;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 16%);
  cursor: pointer;
}

.rform__save {
  padding: 12px 22px;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #06070c;
  background: var(--fr-fg, #e8e6e1);
  border: 0;
  cursor: pointer;
}

.rform__save:hover { filter: brightness(1.08); }

.form-enter-active, .form-leave-active { transition: opacity 0.28s ease; }
.form-enter-from, .form-leave-to { opacity: 0; }

@media (max-width: 720px) {
  .rform__row, .rform__media { grid-template-columns: 1fr; }
  .rform__body { padding: 18px 18px 8px; }
  .rform__head, .rform__foot { padding-inline: 18px; }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
