<script setup lang="ts">
import gsap from 'gsap'
import type { Relic, RelicScene } from '~/data/relics'

const { relics } = useRelics()
const { lang } = useI18n()
const { activeSlug, open, close } = useProjectModal()
const route = useRoute()
const frame = ref<{ focusSelf: () => void } | null>(null)
const sheet = ref<{ goTo: (index: number) => void } | null>(null)
let lastFocus: HTMLElement | null = null

const detail = ref<Relic | null>(null)
const relic = computed(() => {
  if (detail.value && detail.value.id === activeSlug.value) return detail.value
  return relics.value.find(r => r.id === activeSlug.value) ?? null
})

let detailRequest: Promise<void> | null = null
let detailRequestSlug = ''

/** A lista pública é leve (e o seed pode estar desatualizado): o detalhe manda. */
async function loadDetail(slug: string): Promise<void> {
  if (!slug) return
  if (detailRequest && detailRequestSlug === slug) return detailRequest

  detailRequestSlug = slug
  detailRequest = (async () => {
    try {
      const full = await $fetch<Relic>(`/api/public/relics/${encodeURIComponent(slug)}`, {
        query: { lang: lang.value },
      })
      if (!full || activeSlug.value !== slug) return
      detail.value = full
      relics.value = relics.value.map(r => (r.id === slug ? { ...r, ...full } : r))
      typedNarration.setSteps(full.steps ?? [])
      if (armed.value) {
        typedNarration.goTo(full.steps?.[0]?.audio_url ? 0 : Math.min(1, Math.max(0, (full.steps?.length ?? 1) - 1)))
        void typedNarration.play()
      }
    }
    catch {
      // preserve current: a lista continua a renderizar
    }
  })().finally(() => {
    detailRequest = null
  })

  return detailRequest
}

watch(
  () => activeSlug.value,
  (slug) => {
    if (!slug) {
      detail.value = null
      return
    }
    void loadDetail(slug)
  },
  { immediate: true },
)

// FE-18: trocar de idioma recarrega o diário aberto (texto e áudio por passo)
watch(lang, () => {
  if (!activeSlug.value) return
  detail.value = null
  detailRequestSlug = ''
  void loadDetail(activeSlug.value)
})
const index = ref(0)
const quizOpen = ref(false)
const lightbox = ref<RelicScene | null>(null)
const glitching = ref(false)
const typing = ref(false)
const armed = ref(false)

const { act } = useAct()
const soundtrack = useSoundtrack()

let glitchTimers: number[] = []
let glitchVoice: HTMLAudioElement | null = null
let hashTimer = 0
let hashTries = 0

/** O "diário perdido" pisca 3 vezes, cada uma com o seu som. */
function runGlitch(): void {
  const voice = (): HTMLAudioElement => {
    if (!glitchVoice) {
      glitchVoice = new Audio('/media/glitch.mp3')
      glitchVoice.preload = 'auto'
    }
    return glitchVoice
  }
  const burst = (delay: number, rate: number): void => {
    glitchTimers.push(window.setTimeout(() => {
      const el = voice().cloneNode() as HTMLAudioElement
      el.volume = 0.3
      el.playbackRate = rate
      void el.play().catch(() => {})
    }, delay))
  }

  glitchTimers.push(window.setTimeout(() => { glitching.value = true }, 360))
  burst(360 + 70, 1)
  burst(360 + 690, 0.8)
  burst(360 + 1330, 1.22)
  glitchTimers.push(window.setTimeout(() => { glitching.value = false }, 360 + 2280))
  // só depois do glitch o robô sobe (com balão) e o diário começa a escrever
  glitchTimers.push(window.setTimeout(() => { armed.value = true }, 360 + 2380))
}

function clearGlitch(): void {
  glitchTimers.forEach(clearTimeout)
  glitchTimers = []
  glitching.value = false
}

const sceneCount = computed(() => Math.max(1, relic.value?.scenes?.length ?? 1))
const progress = computed(() => (index.value + 1) / sceneCount.value)
const hasQuiz = computed(() => (relic.value?.quiz?.length ?? 0) > 0)
const atLastScene = computed(() => index.value >= sceneCount.value - 1)

const step = (direction: number): void => {
  const next = Math.min(sceneCount.value - 1, Math.max(0, index.value + direction))
  sheet.value?.goTo(next)
}

/** Entrada: scrim, moldura com blur/scale e conteúdo em stagger. */
const onEnter = (el: Element, done: () => void): void => {
  const sheetEl = el.querySelector('.sheet')
  const scrim = el.querySelector('[data-scrim]')
  const timeline = gsap.timeline({ onComplete: done })

  if (scrim) timeline.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.62, ease: 'power2.out' }, 0)
  if (sheetEl) {
    timeline.fromTo(
      sheetEl,
      { opacity: 0, y: 76, scale: 0.92, filter: 'blur(22px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'power4.out' },
      0.04,
    )
  }
}

const onLeave = (el: Element, done: () => void): void => {
  const sheetEl = el.querySelector('.sheet')
  const scrim = el.querySelector('[data-scrim]')
  const timeline = gsap.timeline({ onComplete: done })
  if (scrim) timeline.to(scrim, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
  if (sheetEl) {
    timeline.to(
      sheetEl,
      { opacity: 0, y: 24, scale: 0.975, filter: 'blur(8px)', duration: 0.42, ease: 'power3.in' },
      0,
    )
  }
}

const typedNarration = useNarration()

/** `/#slug` abre o diário; fechar limpa o hash (link direto partilhável). */
function syncHash(): void {
  if (!import.meta.client) return
  const target = activeSlug.value ? `#${activeSlug.value}` : ''
  if (target) {
    if (window.location.hash !== target) window.history.replaceState(window.history.state, '', target)
    return
  }
  if (!window.location.hash) return
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
}

function openFromHash(): void {
  if (!import.meta.client || window.location.pathname !== '/') return
  const id = window.location.hash.replace(/^#/, '')
  if (!id) return
  if (relics.value.some(item => item.id === id)) {
    open(id)
    void loadDetail(id)
  }
}

/** O hash inicial pode chegar depois da hidratação; tenta durante ~3 s. */
function scheduleHashOpen(): void {
  if (!import.meta.client) return
  hashTries = 0
  const attempt = (): void => {
    openFromHash()
    if (!activeSlug.value && hashTries++ < 30) {
      hashTimer = window.setTimeout(attempt, 100)
    }
  }
  attempt()
}

// A lista pode chegar depois do primeiro mount (API ou hidratação); tenta de novo
// quando os ids mudam e uma última vez no tick seguinte.
watch(
  () => relics.value.map(item => item.id).join('|'),
  () => { void nextTick(openFromHash) },
)

// O router só resolve o hash depois da hidratação em alguns deep links.
watch(
  () => route.hash,
  () => { void nextTick(openFromHash) },
  { immediate: true },
)

let skipIndexSync = false
let openedId = ''

watch(relic, (value) => {
  // O detalhe chega depois da lista: é enriquecimento, não uma nova abertura.
  const id = value?.id ?? ''
  if (id !== '' && id === openedId) {
    syncHash()
    return
  }
  openedId = id

  // O reset abaixo não pode disparar o mapeamento cena→passo (mataria a intro).
  if (index.value !== 0) skipIndexSync = true
  index.value = 0
  lightbox.value = null
  quizOpen.value = false
  if (!import.meta.client) return
  if (value !== null) {
    lastFocus = (document.activeElement as HTMLElement | null) ?? null
    // a trilha do arquivo cala-se enquanto o diário está aberto
    soundtrack.stop()
    typedNarration.setSteps(value.steps ?? [])
    armed.value = false
    typing.value = false
    clearGlitch()
    runGlitch()
    void nextTick(() => frame.value?.focusSelf())
  } else {
    clearGlitch()
    armed.value = false
    typedNarration.stop()
    if (act.value === 'scene') void soundtrack.play()
    lastFocus?.focus?.()
    lastFocus = null
  }
  syncHash()
}, { flush: 'post' })

// A narração começa assim que o diário está armado (o clique que abriu já
// autorizou áudio). Sem ficheiro, o fallback fala a legenda.
watch(armed, (ready) => {
  if (!ready) return
  const steps = relic.value?.steps ?? []
  typedNarration.goTo(steps[0]?.audio_url ? 0 : Math.min(1, Math.max(0, steps.length - 1)))
  void typedNarration.play()
})

// Cada cena corresponde ao passo seguinte (steps[0] é a introdução).
watch(index, (next) => {
  if (skipIndexSync) {
    skipIndexSync = false
    return
  }
  const step = next + 1
  if (typedNarration.stepIndex.value !== step) typedNarration.goTo(step)
})

const focusables = (): HTMLElement[] => {
  const root = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
  ).filter(el => el.offsetParent !== null || el === document.activeElement)
}

function onKey(e: KeyboardEvent): void {
  if (quizOpen.value && e.key === 'Escape') {
    quizOpen.value = false
    return
  }
  if (relic.value === null || lightbox.value !== null) return
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
    e.preventDefault()
    step(1)
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault()
    step(-1)
    return
  }
  if (e.key !== 'Tab') return
  const items = focusables()
  if (items.length === 0) {
    e.preventDefault()
    return
  }
  const first = items[0]
  const last = items.at(-1)
  if (!first || !last) {
    e.preventDefault()
    return
  }
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && (active === first || active === null || !items.includes(active))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || active === null || !items.includes(active))) {
    e.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('hashchange', openFromHash)
  void nextTick(scheduleHashOpen)
})
onBeforeUnmount(() => {
  window.clearTimeout(hashTimer)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('hashchange', openFromHash)
  clearGlitch()
  typedNarration.stop()
})
</script>

<template>
  <Teleport to="body">
    <Transition appear :css="false" @enter="onEnter" @leave="onLeave">
      <div v-if="relic" data-modal>
        <SheetFrame
          ref="frame"
          overlay
          :label="relic.name"
          :progress="progress"
          :glitch="glitching"
          @close="close"
        >
          <RelicSheet
            ref="sheet"
            :relic="relic"
            :index="index"
            :armed="armed"
            @update:index="index = $event"
            @open-media="lightbox = $event"
            @typing="typing = $event"
          />
        </SheetFrame>
        <RelicQuizButton v-if="relic && armed && hasQuiz && atLastScene" @click="quizOpen = true" />
        <RelicQuiz v-if="relic && quizOpen" :relic="relic" @close="quizOpen = false" />
        <Transition name="bot">
          <BotNarrator v-if="relic && armed" :talking="typing || typedNarration.playing.value" />
        </Transition>
        <NarrationControls v-if="relic && armed" />
        <Transition name="lb">
          <MediaLightbox v-if="lightbox" :media="lightbox" @close="lightbox = null" />
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bot-enter-active {
  transition:
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

.bot-enter-from {
  opacity: 0;
  transform: translateY(34px) scale(0.9);
}

.bot-leave-active {
  transition: opacity 0.3s ease;
}

.bot-leave-to {
  opacity: 0;
}

.lb-enter-active,
.lb-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.lb-enter-from,
.lb-leave-to {
  opacity: 0;
}
</style>
