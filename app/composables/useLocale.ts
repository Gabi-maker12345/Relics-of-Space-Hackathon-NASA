const STORAGE_KEY = 'zenite:lang:v1'

export type Lang = 'pt' | 'en'

/**
 * Seletor PT/EN. O idioma por omissão é inglês; a escolha guarda-se e o
 * `<html lang>` acompanha para leitores de ecrã.
 */
export function useLocale() {
  const lang = useState<Lang>('locale', () => 'en')

  const apply = (): void => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang.value === 'pt' ? 'pt-PT' : 'en'
  }

  const load = (): void => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'pt' || raw === 'en') lang.value = raw
    }
    catch {
      /* ignora */
    }
    apply()
  }

  const setLang = (value: Lang): void => {
    lang.value = value
    apply()
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, value)
    }
    catch {
      /* ignora */
    }
  }

  const toggle = (): void => setLang(lang.value === 'pt' ? 'en' : 'pt')

  return { lang, setLang, toggle, load }
}
