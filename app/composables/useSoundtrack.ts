let audio: HTMLAudioElement | null = null
let fallbackTried = false
let fadeFrame = 0
let ducked = false
let muteWatched = false

const PRIMARY = '/videoplayback.webm'
const FALLBACK = '/media/cosmos-ambient.mp3'
export const SOUNDTRACK_VOLUME = 0.34
const DUCK_VOLUME = 0.06

function targetVolume(): number {
  if (useSound().muted.value) return 0
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

/** Trilha do arquivo: /videoplayback.webm (a mix) e, se faltar, a cama ambiente. */
export function useSoundtrack() {
  const playing = useState('soundtrack-playing', () => false)
  const { muted } = useSound()

  const ensure = (): HTMLAudioElement => {
    if (audio) return audio
    audio = new Audio()
    audio.loop = true
    audio.preload = 'metadata'
    audio.volume = 0
    audio.src = PRIMARY
    if (import.meta.dev) {
      ;(window as unknown as Record<string, unknown>).__soundtrack = audio
    }
    audio.addEventListener('error', () => {
      if (!audio || fallbackTried) return
      fallbackTried = true
      audio.src = FALLBACK
      if (playing.value) void audio.play().catch(() => {})
    })
    return audio
  }

  /**
   * Arranca em silêncio dentro do gesto do clique (a política de autoplay só
   * aceita click/tap/tecla). Com o som desligado por padrão, fica a zero até o
   * utilizador ligar o botão.
   */
  const prime = async (): Promise<void> => {
    if (!import.meta.client) return
    const el = ensure()
    el.volume = 0
    try {
      await el.play()
      playing.value = true
      document.documentElement.dataset.sound = 'primed'
    } catch {
      playing.value = false
    }
  }

  const play = async (): Promise<void> => {
    if (!import.meta.client) return
    const el = ensure()
    if (el.paused) {
      try {
        await el.play()
      } catch {
        return
      }
    }
    playing.value = true
    document.documentElement.dataset.sound = 'on'
    fadeTo(targetVolume(), 2600)
  }

  const stop = (): void => {
    if (!audio) return
    fadeTo(0, 700, () => audio?.pause())
    playing.value = false
    delete document.documentElement.dataset.sound
  }

  /** Abaixa a trilha enquanto a narração de um passo toca. */
  const duck = (on: boolean): void => {
    ducked = on
    if (!audio || audio.paused) return
    fadeTo(targetVolume(), on ? 420 : 900)
  }

  /** Reaplica o volume quando o mute global muda. */
  const refresh = (): void => {
    if (!audio || audio.paused) return
    fadeTo(targetVolume(), 320)
  }

  if (!muteWatched) {
    muteWatched = true
    watch(muted, refresh)
  }

  return { prime, play, stop, duck, refresh, playing, muted }
}
