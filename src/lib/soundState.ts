const STORAGE_KEY = 'space-relics:sound:v1'

let muted = true
const listeners = new Set<() => void>()

export function isMuted(): boolean {
  return muted
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function loadMutedFromStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw !== null) muted = raw === '1'
  } catch {
    /* storage indisponível */
  }
  notify()
}

export function setMutedFlag(value: boolean): void {
  muted = value
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* ignora */
    }
  }
  notify()
}
