'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePanels } from '@/hooks/usePanels'

export function ProfilePanel() {
  const { active, close } = usePanels()
  const { signIn, error } = useAuth()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)

  useEffect(() => setMounted(true), [])

  const open = active === 'profile'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signIn(email, password)) return
    setPassword('')
    close()
    router.push('/admin')
  }

  return (
    <>
      {mounted
        ? createPortal(
            open ? <div className="portal__veil" aria-hidden="true" /> : null,
            document.body,
          )
        : null}

      <div className={`portal${open ? ' is-open' : ''}`}>
        <div
          data-gl-shield
          data-shield="profile"
          className={`portal__inner${open ? '' : ' pointer-events-none'}`}
        >
          <p className="portal__kicker" data-gl="text">Arquivo · acesso restrito</p>
          <h2 className="portal__title" data-gl="text">Entrar</h2>

          <form className="portal__form" noValidate onSubmit={submit}>
            <label className="portal__field">
              <span className="portal__label" data-gl="text">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                name="email"
                autoComplete="email"
                className="portal__input"
                placeholder="nome@dominio.space"
              />
            </label>

            <label className="portal__field">
              <span className="portal__label" data-gl="text">Palavra-passe</span>
              <span className="portal__wrap">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={reveal ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  className="portal__input"
                  placeholder="••••••••"
                />
                <button
                  className="portal__reveal"
                  type="button"
                  aria-pressed={reveal}
                  tabIndex={-1}
                  onClick={() => setReveal(!reveal)}
                >
                  {reveal ? 'esconder' : 'mostrar'}
                </button>
              </span>
            </label>

            {error ? <p className="portal__error" role="alert">{error}</p> : null}

            <button className="portal__submit" type="submit">
              <span>Entrar no arquivo</span>
              <svg viewBox="0 0 24 12" aria-hidden="true"><path d="M0 6h22M17 1l5 5-5 5" /></svg>
            </button>
          </form>

          <p className="portal__hint" data-gl="text">
            demonstração · <code>admin@spacerelics.space</code> / <code>relics2026</code>
          </p>
        </div>
      </div>
    </>
  )
}
