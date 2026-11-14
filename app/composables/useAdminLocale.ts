const ADMIN_STORAGE_KEY = 'space-relics:admin-lang:v1'

export type AdminLang = 'pt' | 'en'

/**
 * Idioma do painel de administração (FE-18).
 *
 * É independente do idioma público: o cabeçalho do site muda a landing e o
 * painel tem o seu próprio seletor (canto superior direito). A escolha é
 * guardada em localStorage.
 */
export function useAdminLocale() {
  const lang = useState<AdminLang>('admin-locale', () => 'pt')

  const load = (): void => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEY)
      if (raw === 'pt' || raw === 'en') lang.value = raw
    }
    catch {
      /* ignora */
    }
  }

  const setLang = (value: AdminLang): void => {
    lang.value = value
    if (!import.meta.client) return
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, value)
    }
    catch {
      /* ignora */
    }
  }

  const toggle = (): void => setLang(lang.value === 'pt' ? 'en' : 'pt')

  return { lang, setLang, toggle, load }
}
