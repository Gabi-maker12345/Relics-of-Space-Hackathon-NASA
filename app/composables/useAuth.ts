const SESSION_KEY = 'space-relics:session:v1'

/** Credencial de demonstração (semente em scripts/setup-admin.mjs). */
export const DEMO_ACCOUNT = { email: 'admin@spacerelics.space', password: 'relics2026' }

export function useAuth() {
  const user = useState<string | null>('auth-user', () => null)
  const loaded = useState<boolean>('auth-loaded', () => false)
  const error = ref('')

  const restore = async (): Promise<void> => {
    if (!import.meta.client) return
    try {
      const res = await $fetch<{ authenticated: boolean, user: { id: string, email: string } | null }>('/api/auth/me')
      if (res?.authenticated && res.user) {
        user.value = res.user.email
      }
      else {
        user.value = null
      }
    }
    catch {
      // Fallback local caso offline
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (raw) user.value = raw
      }
      catch {
        /* ignora */
      }
    }
    finally {
      loaded.value = true
    }
  }

  const signIn = async (email: string, password: string): Promise<boolean> => {
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

    try {
      const res = await $fetch<{ ok: boolean, user: { id: string, email: string } }>('/api/auth/login', {
        method: 'POST',
        body: { email: mail, password },
      })
      if (res?.ok && res.user) {
        user.value = res.user.email
        if (import.meta.client) {
          try {
            localStorage.setItem(SESSION_KEY, res.user.email)
          }
          catch {
            /* ignora */
          }
        }
        return true
      }
      error.value = 'Falha ao autenticar.'
      return false
    }
    catch (err: unknown) {
      const apiError = err as { data?: { message?: string }, statusMessage?: string, message?: string }
      error.value = apiError.data?.message || apiError.statusMessage || apiError.message || 'Credenciais incorrectas.'
      return false
    }
  }

  const signOut = async (): Promise<void> => {
    user.value = null
    error.value = ''
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    }
    catch {
      /* ignora */
    }
    finally {
      if (import.meta.client) {
        try {
          localStorage.removeItem(SESSION_KEY)
        }
        catch {
          /* ignora */
        }
      }
    }
  }

  return { user, loaded, error, restore, signIn, signOut }
}
