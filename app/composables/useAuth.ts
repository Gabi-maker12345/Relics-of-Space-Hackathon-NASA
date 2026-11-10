export function useAuth() {
  const user = useState<string | null>('auth-user', () => null)
  const loaded = useState<boolean>('auth-loaded', () => false)
  const error = ref('')

  const restore = async (): Promise<void> => {
    if (!import.meta.client) {
      loaded.value = true
      return
    }
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
      user.value = null
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
    if (password.length < 8) {
      error.value = 'A palavra-passe precisa de 8 caracteres ou mais.'
      return false
    }

    try {
      const res = await $fetch<{ ok: boolean, user: { id: string, email: string } }>('/api/auth/login', {
        method: 'POST',
        body: { email: mail, password },
      })
      if (res?.ok && res.user) {
        user.value = res.user.email
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
  }

  return { user, loaded, error, restore, signIn, signOut }
}
