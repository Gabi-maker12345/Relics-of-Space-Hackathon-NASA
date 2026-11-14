<script setup lang="ts">
import type { Relic } from '#shared/types/relic'

const props = defineProps<{ relic: Relic }>()
const emit = defineEmits<{ close: [], progress: [value: number] }>()

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

const questions = computed(() =>
  [...(props.relic.quiz ?? [])].sort((a, b) => a.position - b.position),
)
const question = computed(() => questions.value[index.value] ?? null)
const total = computed(() => questions.value.length)
const score = computed(() => correctCount.value * 15)
const maxScore = computed(() => total.value * 15)
const percentage = computed(() => (total.value === 0 ? 0 : Math.round((correctCount.value / total.value) * 100)))

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
  }, 1200)
}

onMounted(() => {
  start()
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

watch([phase, index, feedback, correctCount], () => {
  const value = phase.value === 'result'
    ? 1
    : total.value === 0
      ? 0
      : Math.min(1, (index.value + (feedback.value ? 1 : 0)) / total.value)
  emit('progress', value)
}, { immediate: true })

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
  <section class="qpanel" aria-labelledby="qpanel-title">
    <header class="qpanel__head">
      <div>
        <p class="qpanel__kicker">Quiz · {{ relic.name }}</p>
        <h2 id="qpanel-title" class="qpanel__title">
          {{ phase === 'result' ? 'Resultado' : phase === 'loading' ? 'E agora?' : 'Prova o que sabes' }}
        </h2>
      </div>
      <button type="button" class="qpanel__exit" @click="emit('close')">Voltar ao diário</button>
    </header>

    <div v-if="phase === 'loading'" class="qpanel__loading" role="status">
      <span class="qpanel__orbit" aria-hidden="true">
        <span /><span /><span />
      </span>
      <p class="qpanel__loadingText">A preparar as perguntas…</p>
    </div>

    <div v-else-if="phase === 'error'" class="qpanel__state">
      <p class="qpanel__err" role="alert">{{ error }}</p>
      <button type="button" class="qpanel__btn qpanel__btn--ghost" @click="emit('close')">Voltar</button>
    </div>

    <template v-else-if="phase === 'question' && question">
      <div class="qpanel__meta">
        <span>Pergunta {{ index + 1 }} <em>/ {{ total }}</em></span>
        <span>{{ correctCount }} certa{{ correctCount === 1 ? '' : 's' }}</span>
      </div>
      <div class="qpanel__bar" aria-hidden="true">
        <span :style="{ width: `${((index + (feedback ? 1 : 0)) / total) * 100}%` }" />
      </div>

      <p class="qpanel__question">{{ question.question }}</p>

      <div class="qpanel__options" role="group" aria-label="Opções de resposta">
        <button
          v-for="(option, optionIndex) in question.options"
          :key="`${question.id}-${optionIndex}`"
          type="button"
          class="qpanel__option"
          :class="optionClass(optionIndex)"
          :disabled="Boolean(feedback) || checking"
          :aria-pressed="selected === optionIndex"
          @click="choose(optionIndex)"
        >
          <span class="qpanel__letter">{{ letters[optionIndex] }}</span>
          <span class="qpanel__optionText">{{ option }}</span>
        </button>
      </div>

      <p v-if="error" class="qpanel__err" role="alert">{{ error }}</p>

      <div v-if="feedback" class="qpanel__feedback" role="status">
        <p class="qpanel__verdict" :class="{ 'is-right': feedback.correct }">
          {{ feedback.correct ? 'Certo.' : 'Não foi desta.' }}
        </p>
        <p v-if="feedback.explanation" class="qpanel__explanation">{{ feedback.explanation }}</p>
        <button type="button" class="qpanel__btn" @click="next">
          {{ index + 1 >= total ? 'Ver resultado' : 'Próxima pergunta' }}
        </button>
      </div>
    </template>

    <div v-else-if="phase === 'result'" class="qpanel__result">
      <p class="qpanel__score">{{ score }}<span>/{{ maxScore }}</span></p>
      <p class="qpanel__scoreNote">{{ correctCount }} de {{ total }} certas · {{ percentage }}%</p>
      <p class="qpanel__message">
        {{ score === maxScore
          ? 'Perfeito. O arquivo não tem segredos para ti.'
          : score >= maxScore * 0.6
            ? 'Bom trabalho — já conheces bem esta relíquia.'
            : 'Vale a pena voltar a ler o diário e tentar outra vez.' }}
      </p>
      <div class="qpanel__resultActions">
        <button type="button" class="qpanel__btn qpanel__btn--ghost" @click="start">Repetir</button>
        <button type="button" class="qpanel__btn" @click="emit('close')">Voltar ao diário</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.qpanel {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 0.6rem;
  scrollbar-width: none;
  color: var(--color-ink, #0b0b0b);
}

.qpanel::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.qpanel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  padding-right: 3.6rem;
}

.qpanel__kicker {
  margin: 0 0 0.7rem;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(0 0 0 / 0.55);
}

.qpanel__title {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(2.2rem, 2.8vw, 3.2rem);
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.03em;
}

.qpanel__exit {
  padding: 0.6rem 0;
  border: 0;
  background: none;
  color: rgb(0 0 0 / 0.55);
  font: inherit;
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  border-bottom: 1px solid rgb(0 0 0 / 0.2);
}

.qpanel__exit:hover {
  color: #000;
  border-color: #000;
}

.qpanel__loading {
  display: grid;
  place-items: center;
  gap: 2.2rem;
  flex: 1;
  padding: 4rem 0;
}

.qpanel__orbit {
  position: relative;
  width: 7rem;
  height: 7rem;
  border-radius: 50%;
  border: 1px solid rgb(0 0 0 / 0.14);
}

.qpanel__orbit span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.9rem;
  height: 0.9rem;
  margin: -0.45rem;
  border-radius: 50%;
  background: #0b0b0b;
  animation: qorbit 1.6s linear infinite;
}

.qpanel__orbit span:nth-child(2) {
  background: #7a5c3a;
  animation-delay: -0.53s;
}

.qpanel__orbit span:nth-child(3) {
  background: #b09a7a;
  animation-delay: -1.06s;
}

.qpanel__loadingText {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(0 0 0 / 0.5);
}

@keyframes qorbit {
  from { transform: rotate(0deg) translateX(3.5rem); }
  to { transform: rotate(360deg) translateX(3.5rem); }
}

.qpanel__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(0 0 0 / 0.55);
}

.qpanel__meta em {
  font-style: normal;
  opacity: 0.6;
}

.qpanel__bar {
  height: 0.25rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.1);
  overflow: hidden;
}

.qpanel__bar span {
  display: block;
  height: 100%;
  background: #0b0b0b;
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.qpanel__question {
  margin: 0.2rem 0 0;
  max-width: 32ch;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(1.7rem, 2.2vw, 2.4rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.qpanel__options {
  display: grid;
  gap: 0.6rem;
  max-width: 62rem;
}

.qpanel__option {
  display: grid;
  grid-template-columns: 2.4rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.2rem;
  text-align: left;
  color: inherit;
  background: rgb(0 0 0 / 0.02);
  border: 1px solid rgb(0 0 0 / 0.13);
  border-radius: 1rem;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.qpanel__option:hover:not(:disabled) {
  border-color: rgb(0 0 0 / 0.45);
  background: rgb(0 0 0 / 0.04);
  transform: translateX(0.2rem);
}

.qpanel__option.is-selected {
  border-color: #0b0b0b;
}

.qpanel__option.is-correct {
  border-color: #1f8f5f;
  background: rgb(31 143 95 / 0.1);
}

.qpanel__option.is-wrong {
  border-color: #b23b3b;
  background: rgb(178 59 59 / 0.09);
}

.qpanel__option.is-dim {
  opacity: 0.45;
}

.qpanel__letter {
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border: 1px solid rgb(0 0 0 / 0.2);
  border-radius: 50%;
  font-size: 0.95rem;
  font-weight: 700;
}

.qpanel__optionText {
  font-size: 1.3rem;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.qpanel__feedback {
  display: grid;
  gap: 0.6rem;
  max-width: 62rem;
  padding-top: 1.4rem;
  border-top: 1px solid rgb(0 0 0 / 0.12);
}

.qpanel__verdict {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #a23333;
}

.qpanel__verdict.is-right {
  color: #1f7d55;
}

.qpanel__explanation {
  margin: 0;
  max-width: 60ch;
  font-size: 1.2rem;
  line-height: 1.45;
  color: rgb(0 0 0 / 0.65);
}

.qpanel__btn {
  justify-self: start;
  margin-top: 0.4rem;
  padding: 1rem 2rem;
  border: 0;
  border-radius: 999px;
  background: #0b0b0b;
  color: var(--color-paper, #f6f4ef);
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.qpanel__btn:hover {
  transform: translateY(-0.1rem);
}

.qpanel__btn--ghost {
  background: none;
  border: 1px solid rgb(0 0 0 / 0.25);
  color: inherit;
  font-weight: 600;
}

.qpanel__btn--ghost:hover {
  border-color: #0b0b0b;
}

.qpanel__result {
  display: grid;
  justify-items: center;
  align-content: center;
  flex: 1;
  gap: 0.8rem;
  text-align: center;
  padding: 2rem 0;
}

.qpanel__score {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(6rem, 9vw, 9rem);
  line-height: 0.9;
  letter-spacing: -0.04em;
}

.qpanel__score span {
  font-size: 0.36em;
  opacity: 0.4;
}

.qpanel__scoreNote {
  margin: 0;
  font-size: 0.95rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(0 0 0 / 0.55);
}

.qpanel__message {
  margin: 1rem 0 1.6rem;
  max-width: 40ch;
  font-size: 1.35rem;
  line-height: 1.5;
  color: rgb(0 0 0 / 0.7);
}

.qpanel__resultActions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.qpanel__err {
  margin: 0.4rem 0;
  color: #a23333;
  font-size: 1.15rem;
}

.qpanel__state {
  display: grid;
  gap: 1.2rem;
  padding: 3rem 0;
}

@media (max-width: 649px) {
  .qpanel__head { padding-right: 3.4rem; }
  .qpanel__question { max-width: none; }
  .qpanel__option { padding: 1.1rem 1.2rem; }
}

@media (prefers-reduced-motion: reduce) {
  .qpanel__orbit span,
  .qpanel__option,
  .qpanel__btn,
  .qpanel__bar span {
    animation: none;
    transition: none;
  }
}
</style>
