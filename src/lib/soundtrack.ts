import { isMuted, subscribeMuted } from './soundState'

let audio: HTMLAudioElement | null = null
let fallbackTried = false
let fadeFrame = 0
let ducked = false

const PRIMARY = '/videoplayback.webm'
const FALLBACK = '/media/cosmos-ambient.mp3'
export const SOUNDTRACK_VOLUME = 0.34
const DUCK_VOLUME = 0.06

function targetVolume(): number {
  if (isMuted()) return 0
  return ducked ? DUCK_VOLUME : SOUNDTRACK_VOLUME
}

function fadeTo(target: number, duration: number, done?: () => void): void {
  if (!audio) return
  cancelAnimationFrame(fadeFrame)
  const from = audio.volume
  const start = performance.now()
  const step = (now: number) => {
    if (!audio) return
    const t = Math.min(1, (now - start) / duration)
    audio.volume = Math.max(0, Math.min(1, from + (target - from) * t))
    if (t < 1) fadeFrame = requestAnimationFrame(step)
    else done?.()
  }
  fadeFrame = requestAnimationFrame(step)
}

function ensure(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.loop = true
  audio.preload = 'metadata'
  audio.volume = 0
  audio.src = PRIMARY
  audio.addEventListener('error', () => {
    if (!audio || fallbackTried) return
    fallbackTried = true
    audio.src = FALLBACK
    if (!audio.paused) void audio.play().catch(() => undefined)
  })
  return audio
}

/**
 * Arranca em silêncio dentro do gesto do clique (a política de autoplay só
 * aceita click/tap/tecla). Com o som desligado por padrão, fica a zero até o
 * utilizador ligar o botão.
 */
export async function primeSoundtrack(): Promise<void> {
  if (typeof window === 'undefined') return
  const el = ensure()
  el.volume = 0
  try {
    await el.play()
    document.documentElement.dataset.sound = 'primed'
  } catch {
    /* bloqueado */
  }
}

export async function playSoundtrack(): Promise<void> {
  if (typeof window === 'undefined') return
  const el = ensure()
  if (el.paused) {
    try {
      await el.play()
    } catch {
      return
    }
  }
  document.documentElement.dataset.sound = 'on'
  fadeTo(targetVolume(), 2600)
}

export function stopSoundtrack(): void {
  if (!audio) return
  fadeTo(0, 700, () => audio?.pause())
  delete document.documentElement.dataset.sound
}

/** Abaixa a trilha enquanto a narração de um passo toca. */
export function duckSoundtrack(on: boolean): void {
  ducked = on
  if (!audio || audio.paused) return
  fadeTo(targetVolume(), on ? 420 : 900)
}

export function refreshSoundtrackVolume(): void {
  if (!audio || audio.paused) return
  fadeTo(targetVolume(), 320)
}

if (typeof window !== 'undefined') subscribeMuted(refreshSoundtrackVolume)
