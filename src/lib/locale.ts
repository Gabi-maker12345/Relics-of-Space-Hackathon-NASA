const STORAGE_KEY = 'space-relics:lang:v1'

export type Lang = 'pt' | 'en'

let lang: Lang = 'pt'
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

function applyDocumentLang(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang === 'pt' ? 'pt-PT' : 'en'
}

export function getLang(): Lang {
  return lang
}

export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setLang(value: Lang): void {
  lang = value
  applyDocumentLang()
  notify()
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* ignora */
  }
}

export function loadLang(): void {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === 'pt' || raw === 'en') lang = raw
    } catch {
      /* ignora */
    }
  }
  applyDocumentLang()
  notify()
}
