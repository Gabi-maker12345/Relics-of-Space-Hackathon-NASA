const STORAGE_KEY = 'space-relics:sound:v1'

/**
 * Mute global (trilha + narração). Desligado por padrão, como o FE-22 pede,
 * e o estado do utilizador sobrevive a recarregamentos.
 */
export function useSound() {
  const muted = useState<boolean>('sound-muted', () => true)
  const loaded = useState<boolean>('sound-loaded', () => false)

  const load = (): void => {
    if (!import.meta.client || loaded.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw !== null) muted.value = raw === '1'
    } catch {
      /* ignora */
    }
    loaded.value = true
  }

  const persist = (): void => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, muted.value ? '1' : '0')
    } catch {
      /* ignora */
    }
  }

  const setMuted = (value: boolean): void => {
    muted.value = value
    persist()
  }

  const toggle = (): void => setMuted(!muted.value)

  return { muted, load, setMuted, toggle }
}
