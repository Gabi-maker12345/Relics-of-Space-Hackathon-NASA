<script setup lang="ts">
import type { QuizQuestion } from '#shared/types/relic'

const props = defineProps<{
  relicId: string
  relicName?: string
}>()

const emit = defineEmits<{ close: [] }>()

type EditableQuestion = {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

const view = ref<'choose' | 'manual'>('choose')
const loading = ref(false)
const error = ref('')
const notice = ref('')
const questions = ref<EditableQuestion[]>([])

const OPTION_COUNT = 4
const MAX = 8

function toEditable(item: QuizQuestion): EditableQuestion {
  const options = [...(item.options ?? [])]
  while (options.length < OPTION_COUNT) options.push('')
  return {
    question: item.question,
    options: options.slice(0, OPTION_COUNT),
    correct_index: item.correct_index ?? 0,
    explanation: item.explanation ?? '',
  }
}

function blank(): EditableQuestion {
  return {
    question: '',
    options: Array.from({ length: OPTION_COUNT }, () => ''),
    correct_index: 0,
    explanation: '',
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ quiz: QuizQuestion[] }>(
      `/api/admin/relics/${encodeURIComponent(props.relicId)}/quiz`,
    )
    questions.value = data.quiz.map(toEditable)
  }
  catch (err: unknown) {
    error.value = apiMessage(err, 'Falha ao carregar o quiz.')
  }
  finally {
    loading.value = false
  }
}

function apiMessage(err: unknown, fallback: string): string {
  const apiError = err as { data?: { message?: string }, statusMessage?: string, message?: string }
  return apiError.data?.message || apiError.statusMessage || apiError.message || fallback
}

onMounted(async () => {
  await load()
  // Quiz já existente abre diretamente na lista editável (sem escolher modo).
  view.value = questions.value.length > 0 ? 'manual' : 'choose'
})

function startManual(): void {
  notice.value = ''
  error.value = ''
  if (questions.value.length === 0) questions.value = [blank()]
  view.value = 'manual'
}

function addQuestion(): void {
  if (questions.value.length >= MAX) return
  questions.value.push(blank())
}

function removeQuestion(index: number): void {
  questions.value.splice(index, 1)
}

function validate(): string {
  for (const [index, item] of questions.value.entries()) {
    if (!item.question.trim()) return `A pergunta ${index + 1} está vazia.`
    if (item.options.some(option => !option.trim())) return `A pergunta ${index + 1} tem opções vazias.`
    if (item.correct_index < 0 || item.correct_index >= item.options.length) {
      return `Escolhe a resposta correta da pergunta ${index + 1}.`
    }
  }
  return ''
}

async function save(): Promise<void> {
  if (questions.value.length === 0) {
    error.value = 'Adiciona pelo menos uma pergunta.'
    return
  }
  const invalid = validate()
  if (invalid) {
    error.value = invalid
    return
  }

  loading.value = true
  error.value = ''
  notice.value = ''
  try {
    const payload = {
      questions: questions.value.map(item => ({
        question: item.question.trim(),
        options: item.options.map(option => option.trim()),
        correct_index: item.correct_index,
        explanation: item.explanation.trim(),
      })),
    }
    const data = await $fetch<{ quiz: QuizQuestion[] }>(
      `/api/admin/relics/${encodeURIComponent(props.relicId)}/quiz`,
      { method: 'PUT', body: payload },
    )
    questions.value = data.quiz.map(toEditable)
    notice.value = 'Quiz guardado.'
  }
  catch (err: unknown) {
    error.value = apiMessage(err, 'Falha ao guardar o quiz.')
  }
  finally {
    loading.value = false
  }
}

async function generate(): Promise<void> {
  loading.value = true
  error.value = ''
  notice.value = ''
  try {
    const data = await $fetch<{ quiz: QuizQuestion[] }>(
      `/api/admin/relics/${encodeURIComponent(props.relicId)}/quiz/generate`,
      { method: 'POST' },
    )
    questions.value = data.quiz.map(toEditable)
    view.value = 'manual'
    notice.value = `${data.quiz.length} perguntas geradas e guardadas. Revê e ajusta se precisares.`
  }
  catch (err: unknown) {
    error.value = apiMessage(err, 'Falha ao gerar o quiz.')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="rquiz" aria-labelledby="rquiz-title">
    <header class="rquiz__head">
      <div>
        <p class="rquiz__kicker">Quiz · {{ relicName || relicId }}</p>
        <h3 id="rquiz-title" class="rquiz__title">
          {{ view === 'choose' ? 'Como queres criar o quiz?' : 'Perguntas do quiz' }}
        </h3>
        <p class="rquiz__lede">
          {{ questions.length }} pergunta{{ questions.length === 1 ? '' : 's' }} · 8 perguntas × 15 pontos = 120
        </p>
      </div>
      <div class="rquiz__headActions">
        <button v-if="view === 'manual' && questions.length === 0" type="button" class="rquiz__ghost" @click="view = 'choose'">
          Modos
        </button>
        <button type="button" class="rquiz__ghost" @click="emit('close')">
          Voltar aos dados
        </button>
      </div>
    </header>

    <p v-if="error" class="rquiz__error" role="alert">{{ error }}</p>
    <p v-if="notice" class="rquiz__notice" role="status">{{ notice }}</p>

    <div v-if="loading" class="rquiz__loading" role="status">
      <span class="rquiz__spinner" aria-hidden="true" />
      {{ view === 'choose' ? 'A preparar…' : 'A guardar…' }}
    </div>

    <template v-else>
      <div v-if="view === 'choose'" class="rquiz__choose">
        <button type="button" class="rquiz__option" @click="generate">
          <span class="rquiz__optionTitle">Gerar quiz automaticamente</span>
          <span class="rquiz__optionText">
            Uma IA escreve 8 perguntas a partir da história, ficha técnica e cenas desta relíquia.
          </span>
        </button>
        <button type="button" class="rquiz__option" @click="startManual">
          <span class="rquiz__optionTitle">Gerar quiz manualmente</span>
          <span class="rquiz__optionText">
            Escreves a pergunta, as quatro opções e marcas a resposta correta.
          </span>
        </button>
        <button
          v-if="questions.length > 0"
          type="button"
          class="rquiz__existing"
          @click="startManual"
        >
          Editar as {{ questions.length }} perguntas existentes
        </button>
      </div>

      <div v-else class="rquiz__editor">
        <article v-for="(item, index) in questions" :key="`q-${index}`" class="rquiz__question">
          <header class="rquiz__questionHead">
            <span class="rquiz__num">{{ String(index + 1).padStart(2, '0') }}</span>
            <button
              type="button"
              class="rquiz__del"
              :aria-label="`Remover pergunta ${index + 1}`"
              @click="removeQuestion(index)"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
            </button>
          </header>

          <label class="rquiz__field">
            <span class="rquiz__label">Pergunta</span>
            <textarea v-model="item.question" class="rquiz__input rquiz__area" rows="2" placeholder="Em que ano pousou…" />
          </label>

          <fieldset class="rquiz__options">
            <legend class="rquiz__label">Opções (marca a correta)</legend>
            <label v-for="(_, optionIndex) in OPTION_COUNT" :key="`o-${optionIndex}`" class="rquiz__optionRow">
              <input v-model="item.correct_index" type="radio" :name="`correct-${index}`" :value="optionIndex">
              <input v-model="item.options[optionIndex]" class="rquiz__input" :placeholder="`Opção ${optionIndex + 1}`">
            </label>
          </fieldset>

          <label class="rquiz__field">
            <span class="rquiz__label">Explicação <em>(opcional)</em></span>
            <input v-model="item.explanation" class="rquiz__input" placeholder="Porque esta é a resposta certa.">
          </label>
        </article>

        <div class="rquiz__editorActions">
          <button type="button" class="rquiz__ghost" :disabled="questions.length >= MAX" @click="addQuestion">
            + pergunta ({{ questions.length }}/{{ MAX }})
          </button>
          <button type="button" class="rquiz__save" @click="save">
            Guardar quiz
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.rquiz {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 20px;
}

.rquiz__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.rquiz__headActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rquiz__kicker {
  margin: 0 0 6px;
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.5;
}

.rquiz__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 400;
}

.rquiz__lede {
  margin: 6px 0 0;
  font-size: 11px;
  opacity: 0.55;
}

.rquiz__error,
.rquiz__notice {
  margin: 0;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 4px;
}

.rquiz__error {
  color: #ffb4b4;
  background: rgb(120 20 20 / 0.35);
}

.rquiz__notice {
  color: #b9ffce;
  background: rgb(20 90 45 / 0.3);
}

.rquiz__loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 26px 0;
  font-size: 12px;
  opacity: 0.7;
}

.rquiz__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgb(255 255 255 / 0.2);
  border-top-color: var(--accent, #7aa2ff);
  border-radius: 50%;
  animation: rquiz-spin 0.8s linear infinite;
}

@keyframes rquiz-spin {
  to { transform: rotate(360deg); }
}

.rquiz__choose {
  display: grid;
  gap: 12px;
}

.rquiz__option {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  text-align: left;
  color: inherit;
  background: rgb(255 255 255 / 3%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.rquiz__option:hover {
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 55%, transparent);
  background: rgb(255 255 255 / 5%);
  transform: translateY(-1px);
}

.rquiz__optionTitle {
  font-size: 15px;
  font-weight: 600;
}

.rquiz__optionText {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.6;
}

.rquiz__existing {
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent, #7aa2ff);
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.rquiz__editor {
  display: grid;
  gap: 14px;
}

.rquiz__question {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 8px;
  background: rgb(255 255 255 / 2%);
}

.rquiz__questionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rquiz__num {
  font-family: var(--fr-serif, inherit);
  font-size: 22px;
  opacity: 0.3;
}

.rquiz__del {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 50%;
  background: none;
  color: inherit;
  cursor: pointer;
}

.rquiz__del svg {
  width: 10px;
  height: 10px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
}

.rquiz__field {
  display: grid;
  gap: 5px;
}

.rquiz__label {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.5;
}

.rquiz__label em {
  font-style: normal;
  opacity: 0.7;
}

.rquiz__input {
  width: 100%;
  padding: 10px 12px;
  color: inherit;
  font: inherit;
  font-size: 13px;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(255 255 255 / 11%);
  border-radius: 4px;
  outline: none;
}

.rquiz__input:focus-visible {
  border-color: var(--accent, #7aa2ff);
}

.rquiz__area {
  resize: vertical;
}

.rquiz__options {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
}

.rquiz__optionRow {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.rquiz__optionRow input[type="radio"] {
  accent-color: var(--accent, #7aa2ff);
}

.rquiz__editorActions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.rquiz__ghost,
.rquiz__save {
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}

.rquiz__ghost {
  border: 1px solid rgb(255 255 255 / 16%);
  background: none;
  color: inherit;
}

.rquiz__ghost:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.rquiz__save {
  border: 0;
  background: var(--fr-paper, #f2f1ed);
  color: #0b0b0b;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .rquiz__spinner { animation: none; }
  .rquiz__option { transition: none; }
}
</style>
