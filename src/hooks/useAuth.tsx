'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const SESSION_KEY = 'space-relics:session:v1'

/** Credencial de demonstração — não há backend (BE-03 não existe). */
export const DEMO_ACCOUNT = { email: 'admin@spacerelics.space', password: 'relics2026' }

type AuthContextValue = {
  user: string | null
  error: string
  restore: () => void
  signIn: (email: string, password: string) => boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  const [error, setError] = useState('')

  const restore = useCallback(() => {
    if (typeof window === 'undefined') return
    setUser((current) => {
      if (current) return current
      try {
        return window.localStorage.getItem(SESSION_KEY)
      } catch {
        return null
      }
    })
  }, [])

  const signIn = useCallback((email: string, password: string) => {
    const mail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError('Escreve um email válido.')
      return false
    }
    if (password.length < 6) {
      setError('A palavra-passe precisa de 6 caracteres ou mais.')
      return false
    }
    if (mail !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) {
      setError('Credenciais incorrectas. Usa a conta de demonstração.')
      return false
    }
    setError('')
    setUser(mail)
    try {
      window.localStorage.setItem(SESSION_KEY, mail)
    } catch {
      /* ignora */
    }
    return true
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setError('')
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignora */
    }
  }, [])

  const value = useMemo(
    () => ({ user, error, restore, signIn, signOut }),
    [user, error, restore, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth fora de <AuthProvider>')
  return value
}
