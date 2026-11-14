import type { RelicStep } from '#shared/types/relic'
import { splitNarrationWords, wordIndexAtChar } from '~/utils/narration'

export type NarrationMode = 'idle' | 'audio' | 'speech'

const steps = ref<RelicStep[]>([])
const stepIndex = ref(0)
const playing = ref(false)
const muted = ref(false)
const captions = ref(true)
const mode = ref<NarrationMode>('idle')
const currentTime = ref(0)
const duration = ref(0)
const speechWord = ref(-1)

let audio: HTMLAudioElement | null = null
let speechSession = 0
let speechFrame = 0
let speechStartedAt = 0
let lastBoundaryAt = 0

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'metadata'
  audio.volume = 1
  audio.addEventListener('timeupdate', () => {
    if (audio) currentTime.value = audio.currentTime
  })
  audio.addEventListener('durationchange', () => {
    if (audio && Number.isFinite(audio.duration)) duration.value = audio.duration
  })
  audio.addEventListener('ended', () => {
    // O passo 0 é a introdução: quando termina, entra a narração da cena 1.
    if (stepIndex.value === 0 && steps.value.length > 1) {
      goTo(1)
      void play()
      return
    }
    playing.value = false
    useSoundtrack().duck(false)
  })
  audio.addEventListener('error', () => {
    // Um URL inválido não deve deixar o botão "a tocar" para sempre.
    if (mode.value === 'audio') {
      mode.value = 'idle'
      playing.value = false
      useSoundtrack().duck(false)
    }
  })
  if (import.meta.dev) {
    ;(window as unknown as Record<string, unknown>).__narration = audio
  }
  return audio
}

function currentStep(): RelicStep | undefined {
  return steps.value[stepIndex.value]
}

function captionOf(step: RelicStep | undefined): string {
  if (!step) return ''
  return (step.caption || step.title || '').trim()
}

function stopSpeechLoop(): void {
  if (speechFrame) cancelAnimationFrame(speechFrame)
  speechFrame = 0
}

function stopSpeech(): void {
  speechSession += 1
  stopSpeechLoop()
  if (import.meta.client && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  speechWord.value = -1
}

/**
 * Sem `onboundary` (vozes que não o emitem), o destaque avança por estimativa:
 * ~14 caracteres por segundo. As boundaries reais, quando existem, corrigem.
 */
function startSpeechEstimate(session: number, text: string): void {
  const words = splitNarrationWords(text)
  if (words.length === 0) return
  const chars = Math.max(1, text.replace(/\s+/g, ' ').length)
  const estimateMs = Math.max(1200, (chars / 14) * 1000)
  speechStartedAt = performance.now()
  lastBoundaryAt = 0

  const tick = (): void => {
    if (session !== speechSession || mode.value !== 'speech' || !playing.value) {
      speechFrame = 0
      return
    }
    if (performance.now() - lastBoundaryAt > 400) {
      const progress = Math.min(0.999, (performance.now() - speechStartedAt) / estimateMs)
      speechWord.value = Math.floor(progress * words.length)
    }
    speechFrame = requestAnimationFrame(tick)
  }
  speechFrame = requestAnimationFrame(tick)
}

function speak(text: string): void {
  if (!import.meta.client || !('speechSynthesis' in window)) {
    mode.value = 'idle'
    playing.value = false
    useSoundtrack().duck(false)
    return
  }

  const session = ++speechSession
  const synth = window.speechSynthesis
  synth.cancel()

  const next = new SpeechSynthesisUtterance(text)
  next.lang = 'pt-BR'
  next.rate = 1
  next.onboundary = (event) => {
    if (session !== speechSession || event.name !== 'word') return
    lastBoundaryAt = performance.now()
    speechWord.value = wordIndexAtChar(text, event.charIndex)
  }
  const finish = (): void => {
    // Utterances canceladas também disparam onend: ignora sessões antigas.
    if (session !== speechSession) return
    playing.value = false
    speechWord.value = -1
    stopSpeechLoop()
    useSoundtrack().duck(false)
  }
  next.onend = finish
  next.onerror = finish

  speechWord.value = 0
  mode.value = 'speech'
  synth.speak(next)
  startSpeechEstimate(session, text)
}

async function play(): Promise<void> {
  const step = currentStep()
  if (!step || !import.meta.client) return

  playing.value = true
  useSoundtrack().duck(true)

  const text = captionOf(step)
  if (step.audio_url) {
    stopSpeech()
    const el = ensureAudio()
    el.muted = muted.value
    if (!el.src || !el.src.endsWith(step.audio_url)) {
      el.src = step.audio_url
      el.load()
    }
    mode.value = 'audio'
    try {
      await el.play()
    }
    catch {
      // Autoplay bloqueado: o botão seguinte continua a funcionar.
      playing.value = false
      useSoundtrack().duck(false)
    }
    return
  }

  // Sem ficheiro, a voz sintetizada não tem volume próprio: silenciar pausa-a.
  audio?.pause()
  if (text && !muted.value) speak(text)
  else {
    mode.value = 'idle'
    playing.value = false
    useSoundtrack().duck(false)
  }
}

function pause(): void {
  playing.value = false
  audio?.pause()
  stopSpeech()
  useSoundtrack().duck(false)
}

function stop(): void {
  pause()
  mode.value = 'idle'
  currentTime.value = 0
  duration.value = 0
  stepIndex.value = 0
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
}

/**
 * Selects the narration step. Audio steps restart when revisited; steps
 * without a file fall back to `speechSynthesis` if playback is already on.
 */
function goTo(index: number, options: { autoplay?: boolean } = {}): void {
  stopSpeech()
  stepIndex.value = index
  currentTime.value = 0
  duration.value = 0

  const step = currentStep()
  if (!step) {
    audio?.pause()
    mode.value = 'idle'
    return
  }

  if (step.audio_url) {
    const el = ensureAudio()
    mode.value = 'audio'
    if (!el.src || !el.src.endsWith(step.audio_url)) {
      el.src = step.audio_url
      el.load()
    }
    else {
      el.currentTime = 0
    }
    if (options.autoplay) void play()
    else if (playing.value) void play()
    else audio?.pause()
    return
  }

  audio?.pause()
  const text = captionOf(step)
  if (playing.value && text) speak(text)
  else mode.value = 'idle'
}

function setSteps(next: RelicStep[]): void {
  steps.value = next
  if (stepIndex.value >= next.length) stepIndex.value = 0
}

function toggle(): void {
  if (playing.value) pause()
  else void play()
}

function setMuted(value: boolean): void {
  muted.value = value
  if (audio) audio.muted = value
  if (value && mode.value === 'speech') {
    stopSpeech()
    playing.value = false
  }
}

function toggleCaptions(): void {
  captions.value = !captions.value
}

/** True while the audio file (or the synthetic voice) is active. */
function hasNarration(index = stepIndex.value): boolean {
  const step = steps.value[index]
  return Boolean(step?.audio_url || captionOf(step))
}

export function useNarration() {
  return {
    steps,
    stepIndex,
    playing,
    muted,
    captions,
    mode,
    currentTime,
    duration,
    speechWord,
    setSteps,
    goTo,
    play,
    pause,
    stop,
    toggle,
    setMuted,
    toggleCaptions,
    hasNarration,
  }
}
