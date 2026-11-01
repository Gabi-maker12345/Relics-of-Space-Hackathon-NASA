let audio: HTMLAudioElement | null = null
let fallbackTried = false
let fadeFrame = 0

const PRIMARY = '/media/infinity.mp3'
const FALLBACK = '/media/cosmos-ambient.mp3'
export const SOUNDTRACK_VOLUME = 0.34

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

/** Trilha do arquivo: usa /media/infinity.mp3 e, se faltar, a cama ambiente. */
export function useSoundtrack() {
  const playing = useState('soundtrack-playing', () => false)

  const ensure = (): HTMLAudioElement => {
    if (audio) return audio
    audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
    audio.src = PRIMARY
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
   * aceita click/tap/tecla). O volume sobe quando a cena 3D chega.
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
    fadeTo(SOUNDTRACK_VOLUME, 2600)
  }

  const stop = (): void => {
    if (!audio) return
    fadeTo(0, 700, () => audio?.pause())
    playing.value = false
    delete document.documentElement.dataset.sound
  }

  const toggle = (): void => {
    if (playing.value) stop()
    else void play()
  }

  return { prime, play, stop, toggle, playing }
}
