<script setup lang="ts">
import type { Relic } from '#shared/types/relic'

const props = defineProps<{ relic: Relic }>()
const emit = defineEmits<{ close: [] }>()

type Phase = 'loading' | 'question' | 'result' | 'error'

type Feedback = {
  correct: boolean
  correct_index: number
  explanation: string
}

const phase = ref<Phase>('loading')
const index = ref(0)
const selected = ref<number | null>(null)
const checking = ref(false)
const feedback = ref<Feedback | null>(null)
const correctCount = ref(0)
const error = ref('')
const closeRef = ref<HTMLButtonElement | null>(null)

const questions = computed(() =>
  [...(props.relic.quiz ?? [])].sort((a, b) => a.position - b.position),
)
const question = computed(() => questions.value[index.value] ?? null)
const total = computed(() => questions.value.length)
const score = computed(() => correctCount.value * 15)
const maxScore = computed(() => total.value * 15)
const progress = computed(() => (total.value === 0 ? 0 : (index.value + (feedback.value ? 1 : 0)) / total.value))

let loadingTimer = 0

function start(): void {
  phase.value = 'loading'
  index.value = 0
  selected.value = null
  feedback.value = null
  correctCount.value = 0
  error.value = ''
  window.clearTimeout(loadingTimer)
  loadingTimer = window.setTimeout(() => {
    phase.value = total.value > 0 ? 'question' : 'error'
    if (total.value === 0) error.value = 'Esta relíquia ainda não tem quiz.'
  }, 1400)
}

onMounted(() => {
  start()
  closeRef.value?.focus()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.clearTimeout(loadingTimer)
  window.removeEventListener('keydown', onKey)
})

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    emit('close')
  }
}

async function choose(optionIndex: number): Promise<void> {
  const current = question.value
  if (!current || feedback.value || checking.value) return

  selected.value = optionIndex
  checking.value = true
  error.value = ''
  try {
    const result = await $fetch<Feedback>(
      `/api/public/relics/${encodeURIComponent(props.relic.id)}/quiz/check`,
      { method: 'POST', body: { question_id: current.id, option_index: optionIndex } },
    )
    feedback.value = result
    if (result.correct) correctCount.value += 1
  }
  catch (err: unknown) {
    const apiError = err as { data?: { message?: string }, message?: string }
    error.value = apiError.data?.message || apiError.message || 'Falha ao corrigir a resposta.'
    selected.value = null
  }
  finally {
    checking.value = false
  }
}

function next(): void {
  if (!feedback.value) return
  if (index.value + 1 >= total.value) {
    phase.value = 'result'
    return
  }
  index.value += 1
  selected.value = null
  feedback.value = null
}

function optionClass(optionIndex: number): Record<string, boolean> {
  const result = feedback.value
  if (!result) return { 'is-selected': selected.value === optionIndex }
  return {
    'is-correct': optionIndex === result.correct_index,
    'is-wrong': optionIndex === selected.value && !result.correct,
    'is-dim': optionIndex !== result.correct_index && optionIndex !== selected.value,
  }
}

const letters = ['A', 'B', 'C', 'D', 'E']
</script>

<template>
  <Teleport to="body">
    <div class="quiz" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <button type="button" class="quiz__scrim" aria-label="Fechar quiz" @click="emit('close')" />

      <section class="quiz__panel">
        <header class="quiz__head">
          <div>
            <p class="quiz__kicker">Quiz · {{ relic.name }}</p>
            <h2 id="quiz-title" class="quiz__title">
              {{ phase === 'result' ? 'Resultado' : 'O que ficou para trás?' }}
            </h2>
          </div>
          <button ref="closeRef" type="button" class="quiz__close" aria-label="Fechar quiz" @click="emit('close')">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
          </button>
        </header>

        <div v-if="phase === 'loading'" class="quiz__loading" role="status">
          <span class="quiz__orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <p class="quiz__loadingText">A preparar as perguntas…</p>
        </div>

        <div v-else-if="phase === 'error'" class="quiz__state">
          <p class="quiz__error" role="alert">{{ error }}</p>
          <button type="button" class="quiz__btn quiz__btn--ghost" @click="emit('close')">Voltar</button>
        </div>

        <div v-else-if="phase === 'question' && question" class="quiz__body">
          <div class="quiz__meta">
            <span>Pergunta {{ index + 1 }} / {{ total }}</span>
            <span>{{ correctCount }} certa{{ correctCount === 1 ? '' : 's' }}</span>
          </div>
          <div class="quiz__bar" aria-hidden="true">
            <span :style="{ width: `${progress * 100}%` }" />
          </div>

          <p class="quiz__question">{{ question.question }}</p>

          <div class="quiz__options" role="group" aria-label="Opções de resposta">
            <button
              v-for="(option, optionIndex) in question.options"
              :key="`${question.id}-${optionIndex}`"
              type="button"
              class="quiz__option"
              :class="optionClass(optionIndex)"
              :disabled="Boolean(feedback) || checking"
              :aria-pressed="selected === optionIndex"
              @click="choose(optionIndex)"
            >
              <span class="quiz__letter">{{ letters[optionIndex] }}</span>
              <span class="quiz__optionText">{{ option }}</span>
            </button>
          </div>

          <p v-if="error" class="quiz__error" role="alert">{{ error }}</p>

          <div v-if="feedback" class="quiz__feedback" role="status">
            <p class="quiz__verdict" :class="{ 'is-right': feedback.correct }">
              {{ feedback.correct ? 'Certo.' : 'Não foi desta.' }}
            </p>
            <p v-if="feedback.explanation" class="quiz__explanation">{{ feedback.explanation }}</p>
            <button type="button" class="quiz__btn" @click="next">
              {{ index + 1 >= total ? 'Ver resultado' : 'Próxima pergunta' }}
            </button>
          </div>
        </div>

        <div v-else-if="phase === 'result'" class="quiz__result">
          <p class="quiz__score">{{ score }}<span>/{{ maxScore }}</span></p>
          <p class="quiz__scoreNote">
            {{ correctCount }} de {{ total }} certas · {{ Math.round((correctCount / total) * 100) }}%
          </p>
          <p class="quiz__message">
            {{ score === maxScore
              ? 'Perfeito. O arquivo não tem segredos para ti.'
              : score >= maxScore * 0.6
                ? 'Bom trabalho — já conheces bem esta relíquia.'
                : 'Vale a pena voltar a ler o diário e tentar outra vez.' }}
          </p>
          <div class="quiz__resultActions">
            <button type="button" class="quiz__btn quiz__btn--ghost" @click="start">Repetir</button>
            <button type="button" class="quiz__btn" @click="emit('close')">Fechar</button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.quiz {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
}

.quiz__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(2 3 8 / 0.82);
  backdrop-filter: blur(16px) saturate(0.7);
  cursor: default;
}

.quiz__panel {
  position: relative;
  width: min(680px, 100%);
  max-height: min(88vh, 820px);
  overflow-y: auto;
  padding: 28px 30px 30px;
  color: #ecebe6;
  background:
    radial-gradient(90% 60% at 50% 0%, rgb(122 162 255 / 0.14), transparent 70%),
    #080a12;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 14px;
  box-shadow: 0 50px 140px rgb(0 0 0 / 0.7);
}

.quiz__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.quiz__kicker {
  margin: 0 0 6px;
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.5;
}

.quiz__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 400;
  line-height: 1.05;
}

.quiz__close {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 50%;
  background: none;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.3s ease;
}

.quiz__close:hover {
  background: rgb(255 255 255 / 8%);
  transform: rotate(90deg);
}

.quiz__close svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
}

.quiz__loading {
  display: grid;
  justify-items: center;
  gap: 18px;
  padding: 40px 0 30px;
}

.quiz__orbit {
  position: relative;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: 1px solid rgb(255 255 255 / 12%);
}

.quiz__orbit span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  margin: -4.5px;
  border-radius: 50%;
  background: #cfe0ff;
  animation: quiz-orbit 1.6s linear infinite;
}

.quiz__orbit span:nth-child(2) {
  animation-delay: -0.53s;
  background: #ffd6a8;
}

.quiz__orbit span:nth-child(3) {
  animation-delay: -1.06s;
  background: #a8ffe0;
}

.quiz__loadingText {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.55;
}

@keyframes quiz-orbit {
  from { transform: rotate(0deg) translateX(37px); }
  to { transform: rotate(360deg) translateX(37px); }
}

.quiz__meta {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.55;
}

.quiz__bar {
  height: 3px;
  margin: 8px 0 22px;
  border-radius: 999px;
  background: rgb(255 255 255 / 10%);
  overflow: hidden;
}

.quiz__bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #7aa2ff, #b5ffd9);
  transition: width 0.35s ease;
}

.quiz__question {
  margin: 0 0 18px;
  font-size: clamp(18px, 2.2vw, 22px);
  line-height: 1.35;
}

.quiz__options {
  display: grid;
  gap: 9px;
}

.quiz__option {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  text-align: left;
  color: inherit;
  background: rgb(255 255 255 / 3%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.quiz__option:hover:not(:disabled) {
  border-color: rgb(255 255 255 / 30%);
  transform: translateX(2px);
}

.quiz__option.is-selected {
  border-color: #7aa2ff;
}

.quiz__option.is-correct {
  border-color: #63e6a0;
  background: rgb(40 140 90 / 0.18);
}

.quiz__option.is-wrong {
  border-color: #ff7a7a;
  background: rgb(160 40 40 / 0.18);
}

.quiz__option.is-dim {
  opacity: 0.4;
}

.quiz__letter {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
}

.quiz__optionText {
  font-size: 14px;
  line-height: 1.35;
}

.quiz__feedback {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgb(255 255 255 / 10%);
}

.quiz__verdict {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #ffb4b4;
}

.quiz__verdict.is-right {
  color: #8dffb9;
}

.quiz__explanation {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.65;
}

.quiz__btn {
  justify-self: start;
  margin-top: 6px;
  padding: 11px 20px;
  border: 0;
  border-radius: 999px;
  background: #ecebe6;
  color: #0b0b0b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
}

.quiz__btn--ghost {
  background: none;
  border: 1px solid rgb(255 255 255 / 18%);
  color: inherit;
  font-weight: 500;
}

.quiz__result {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 8px;
  padding: 16px 0 6px;
}

.quiz__score {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(58px, 9vw, 86px);
  line-height: 1;
}

.quiz__score span {
  font-size: 0.38em;
  opacity: 0.4;
}

.quiz__scoreNote {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.5;
}

.quiz__message {
  margin: 10px 0 18px;
  max-width: 42ch;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.7;
}

.quiz__resultActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.quiz__error {
  margin: 12px 0 0;
  color: #ffb4b4;
  font-size: 12px;
}

.quiz__state {
  display: grid;
  gap: 12px;
  padding: 20px 0;
}

@media (max-width: 640px) {
  .quiz__panel { padding: 22px 18px 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .quiz__orbit span,
  .quiz__option,
  .quiz__close,
  .quiz__bar span {
    animation: none;
    transition: none;
  }
}
</style>
