const SESSION_KEY = 'space-relics:session:v1'

/** Credencial de demonstração — não há backend (BE-03 ainda não existe). */
export const DEMO_ACCOUNT = { email: 'admin@spacerelics.space', password: 'relics2026' }

export function useAuth() {
  const user = useState<string | null>('auth-user', () => null)
  const loaded = useState<boolean>('auth-loaded', () => false)
  const error = ref('')

  const restore = (): void => {
    if (!import.meta.client) return
    if (user.value) {
      loaded.value = true
      return
    }
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) user.value = raw
    } catch {
      /* ignora */
    }
    loaded.value = true
  }

  const signIn = (email: string, password: string): boolean => {
    error.value = ''
    const mail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      error.value = 'Escreve um email válido.'
      return false
    }
    if (password.length < 6) {
      error.value = 'A palavra-passe precisa de 6 caracteres ou mais.'
      return false
    }
    if (mail !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
      error.value = 'Credenciais incorrectas. Usa a conta de demonstração.'
      return false
    }
    user.value = mail
    if (import.meta.client) {
      try {
        localStorage.setItem(SESSION_KEY, mail)
      } catch {
        /* ignora */
      }
    }
    return true
  }

  const signOut = (): void => {
    user.value = null
    error.value = ''
    if (import.meta.client) {
      try {
        localStorage.removeItem(SESSION_KEY)
      } catch {
        /* ignora */
      }
    }
  }

  return { user, loaded, error, restore, signIn, signOut }
}
