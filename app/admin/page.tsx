'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Relic } from '@/data/relics'
import { relicStatus } from '@/utils/relics'
import { useRelics } from '@/hooks/useRelics'
import { useAuth } from '@/hooks/useAuth'
import { usePanels } from '@/hooks/usePanels'
import { RelicCover } from '@/components/RelicCover'
import { StatusBadge } from '@/components/StatusBadge'
import { RelicForm } from '@/components/RelicForm'

type ToastPhase = 'hidden' | 'enter-start' | 'enter-end' | 'leave'

export default function AdminPage() {
  const { relics, load, create, update, remove } = useRelics()
  const { user, restore, signOut } = useAuth()
  const { open: openPanel } = usePanels()
  const router = useRouter()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Relic | null>(null)
  const [restored, setRestored] = useState(false)
  const redirected = useRef(false)

  const [toast, setToast] = useState('')
  const [toastPhase, setToastPhase] = useState<ToastPhase>('hidden')
  const toastFrame = useRef(0)
  const toastTimers = useRef<number[]>([])

  const takenIds = useMemo(
    () => relics.map((relic) => relic.id).filter((id) => id !== editing?.id),
    [relics, editing],
  )

  useEffect(() => {
    load()
    restore()
    setRestored(true)
  }, [load, restore])

  useEffect(() => {
    if (!restored || redirected.current) return
    redirected.current = true
    if (user) return
    openPanel('profile')
    router.replace('/')
  }, [restored, user, openPanel, router])

  useEffect(() => () => clearToastWork(), [])

  function clearToastWork(): void {
    for (const id of toastTimers.current) window.clearTimeout(id)
    toastTimers.current = []
    window.cancelAnimationFrame(toastFrame.current)
  }

  function flash(message: string): void {
    clearToastWork()
    setToast(message)
    setToastPhase('enter-start')
    toastFrame.current = window.requestAnimationFrame(() => {
      toastFrame.current = window.requestAnimationFrame(() => setToastPhase('enter-end'))
    })
    const leave = window.setTimeout(() => {
      setToastPhase('leave')
      const clear = window.setTimeout(() => {
        setToast('')
        setToastPhase('hidden')
      }, 250)
      toastTimers.current = [clear]
    }, 2600)
    toastTimers.current = [leave]
  }

  function openForm(relic: Relic | null): void {
    setEditing(relic)
    setFormOpen(true)
  }

  function store(relic: Relic): void {
    if (editing) {
      update(editing.id, relic)
      flash('Alterações guardadas.')
    } else {
      create(relic)
      flash('Relíquia criada.')
    }
    setFormOpen(false)
    setEditing(null)
  }

  function togglePublished(relic: Relic): void {
    const next = relic.published === false
    update(relic.id, { ...relic, published: next })
    flash(next ? 'Publicada na home.' : 'Movida para rascunho.')
  }

  function confirmRemove(relic: Relic): void {
    if (!window.confirm(`Remover “${relic.name}” do arquivo?`)) return
    remove(relic.id)
    flash('Relíquia removida.')
  }

  function signOutAndLeave(): void {
    signOut()
    setFormOpen(false)
    router.push('/')
  }

  const toastClass =
    toastPhase === 'enter-start'
      ? 'admin__toast toast-enter-active toast-enter-from'
      : toastPhase === 'enter-end'
        ? 'admin__toast toast-enter-active'
        : toastPhase === 'leave'
          ? 'admin__toast toast-leave-active toast-leave-to'
          : 'admin__toast'

  return (
    <section className="admin">
      <header className="admin__head">
        <div>
          <p className="admin__kicker">Arquivo · painel</p>
          <h1 className="admin__title">Relíquias</h1>
          <p className="admin__lede">
            {relics.length} registo{relics.length === 1 ? '' : 's'} · o último cartão abre o formulário
          </p>
        </div>
        <div className="admin__actions">
          <button type="button" className="admin__ghost" onClick={signOutAndLeave}>Sair</button>
        </div>
      </header>

      {!user ? (
        <div className="admin__locked">
          <p className="admin__lockedTitle">Acesso restrito</p>
          <p className="admin__lede">Entra para abrir o arquivo.</p>
          <button type="button" className="admin__primary" onClick={() => openPanel('profile')}>Entrar</button>
        </div>
      ) : (
        <ul className="admin__grid">
          {relics.map((relic) => (
            <li key={relic.id} className="admin__item">
              <article className={relic.published === false ? 'card is-draft' : 'card'}>
                <RelicCover
                  className="card__img"
                  src={relic.image}
                  poster={relic.coverPoster}
                  alt={relic.alt}
                />
                <div className="card__scrim" />
                <div className="card__body">
                  <p className="card__flags">
                    <StatusBadge status={relicStatus(relic)} />
                    {relic.published === false ? <span className="card__draft">Rascunho</span> : null}
                  </p>
                  <p className="card__mission">{relic.mission}</p>
                  <h2 className="card__name">{relic.name}</h2>
                  <p className="card__tagline">{relic.tagline}</p>
                  <p className="card__meta">{relic.facts.length} factos · {relic.scenes.length} cenas</p>
                </div>
                <div className="card__tools">
                  <button type="button" className="card__tool" onClick={() => togglePublished(relic)}>
                    {relic.published === false ? 'Publicar' : 'Despublicar'}
                  </button>
                  <button type="button" className="card__tool" onClick={() => openForm(relic)}>Editar</button>
                  <button
                    type="button"
                    className="card__tool card__tool--danger"
                    onClick={() => confirmRemove(relic)}
                  >Remover</button>
                </div>
              </article>
            </li>
          ))}

          <li className="admin__item">
            <button type="button" className="card card--new" onClick={() => openForm(null)}>
              <span className="card__center" aria-hidden="true">
                <span className="card__plus">
                  <svg viewBox="0 0 48 48"><path d="M24 10v28M10 24h28" /></svg>
                </span>
              </span>
              <span className="card__newLabel">Adicionar relíquia</span>
            </button>
          </li>
        </ul>
      )}

      {toast ? <p className={toastClass} role="status">{toast}</p> : null}

      <RelicForm
        open={formOpen}
        relic={editing}
        takenIds={takenIds}
        onClose={() => setFormOpen(false)}
        onSave={store}
      />
    </section>
  )
}
