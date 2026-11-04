'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Relic, RelicFact, RelicLocation, RelicScene, RelicStatus } from '@/data/relics'
import { isVideoUrl } from '@/utils/relics'

type RelicFormProps = {
  open: boolean
  relic: Relic | null
  takenIds: string[]
  onClose: () => void
  onSave: (relic: Relic) => void
}

type Draft = {
  id: string
  name: string
  mission: string
  tagline: string
  body: string
  image: string
  coverPoster: string
  alt: string
  ratio: string
  status: RelicStatus
  location: RelicLocation
  published: boolean
  facts: RelicFact[]
  scenes: RelicScene[]
}

type Errors = Partial<Record<keyof Draft | 'general', string>>

/** 'enter-start' mantém o par enter-active/enter-from; 'enter-end' solta o from. */
type Phase = 'closed' | 'enter-start' | 'enter-end' | 'idle' | 'leave'

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function emptyScene(kind: 'image' | 'video'): RelicScene {
  return { kind, src: '', poster: '', kicker: kind === 'video' ? 'Transmissão' : 'Fotografia', body: '' }
}

const blank = (): Draft => ({
  id: '',
  name: '',
  mission: '',
  tagline: '',
  body: '',
  image: '',
  coverPoster: '',
  alt: '',
  ratio: '1376 / 768',
  status: 'active',
  location: 'moon',
  published: true,
  facts: [
    { label: '', value: '' },
    { label: '', value: '' },
    { label: '', value: '' },
    { label: '', value: '' },
  ],
  scenes: [emptyScene('image')],
})

/** Mesmo Object.assign do original: campos opcionais ausentes ficam no valor de `blank`. */
function draftFrom(relic: Relic): Draft {
  return { ...blank(), ...(JSON.parse(JSON.stringify(relic)) as Partial<Draft>) }
}

export function RelicForm({ open, relic, takenIds, onClose, onSave }: RelicFormProps) {
  const [draft, setDraft] = useState<Draft>(blank)
  const [errors, setErrors] = useState<Errors>({})
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('closed')
  const phaseRef = useRef<Phase>('closed')
  const idTouched = useRef(false)
  const enterFrame = useRef(0)
  const enterSettle = useRef(0)

  const isEdit = relic !== null
  const coverIsVideo = useMemo(() => isVideoUrl(draft.image), [draft.image])

  const applyPhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      applyPhase('enter-start')
      const first = window.requestAnimationFrame(() => {
        enterFrame.current = window.requestAnimationFrame(() => {
          applyPhase('enter-end')
          enterSettle.current = window.setTimeout(() => applyPhase('idle'), 300)
        })
      })
      return () => {
        window.cancelAnimationFrame(first)
        window.cancelAnimationFrame(enterFrame.current)
        window.clearTimeout(enterSettle.current)
      }
    }

    if (phaseRef.current === 'closed') return
    applyPhase('leave')
    const settle = window.setTimeout(() => applyPhase('closed'), 300)
    return () => window.clearTimeout(settle)
  }, [open, applyPhase])

  // Criar: repõe em branco. Editar: copia a relíquia. (o watch era só sobre `open`)
  useEffect(() => {
    if (!open) return
    setDraft(relic ? draftFrom(relic) : blank())
    // criar: o identificador segue o nome. editar: o identificador fica estável.
    idTouched.current = relic !== null
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const update = (changes: Partial<Draft>): void => {
    setDraft((prev) => ({ ...prev, ...changes }))
  }

  function onName(value: string): void {
    if (idTouched.current) {
      update({ name: value })
      return
    }
    update({ name: value, id: slugify(value) })
  }

  function addFact(): void {
    setDraft((prev) => ({ ...prev, facts: [...prev.facts, { label: '', value: '' }] }))
  }

  function setFact(index: number, key: 'label' | 'value', value: string): void {
    setDraft((prev) => ({
      ...prev,
      facts: prev.facts.map((fact, i) => {
        if (i !== index) return fact
        return key === 'label' ? { ...fact, label: value } : { ...fact, value }
      }),
    }))
  }

  function removeFact(index: number): void {
    setDraft((prev) => ({ ...prev, facts: prev.facts.filter((_, i) => i !== index) }))
  }

  function addScene(): void {
    setDraft((prev) => {
      const last = prev.scenes[prev.scenes.length - 1]
      return { ...prev, scenes: [...prev.scenes, emptyScene(last?.kind === 'video' ? 'video' : 'image')] }
    })
  }

  function setScene(index: number, changes: Partial<RelicScene>): void {
    setDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, i) => (i === index ? { ...scene, ...changes } : scene)),
    }))
  }

  function removeScene(index: number): void {
    setDraft((prev) => ({ ...prev, scenes: prev.scenes.filter((_, i) => i !== index) }))
  }

  function onImageLoad(event: SyntheticEvent<HTMLImageElement>): void {
    const img = event.currentTarget
    if (img.naturalWidth && img.naturalHeight) {
      update({ ratio: `${img.naturalWidth} / ${img.naturalHeight}` })
    }
  }

  /** Converte o ficheiro numa data URL com largura máxima de 1280 px (cabe no localStorage). */
  async function onFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1280 / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    update({ image: canvas.toDataURL('image/jpeg', 0.82), ratio: `${canvas.width} / ${canvas.height}` })
    input.value = ''
  }

  function validate(): boolean {
    const next: Errors = {}
    const required: Array<[keyof Draft, string]> = [
      ['name', 'Dá um nome à relíquia.'],
      ['mission', 'Indica a missão.'],
      ['tagline', 'Escreve a frase de efeito.'],
      ['body', 'Falta a história.'],
      ['image', 'Falta a imagem do cartão.'],
      ['alt', 'Falta o texto alternativo.'],
    ]
    for (const [key, message] of required) {
      if (!String(draft[key] ?? '').trim()) next[key] = message
    }
    if (!/^[a-z0-9-]+$/.test(draft.id)) next.id = 'Só minúsculas, números e hífens.'
    else if (takenIds.includes(draft.id)) next.id = 'Já existe uma relíquia com este identificador.'

    const facts = draft.facts.filter((fact) => fact.label.trim() && fact.value.trim())
    if (facts.length < 1) next.facts = 'Preenche pelo menos uma linha da ficha.'

    const scenes = draft.scenes.filter((scene) => scene.src.trim() && scene.body.trim())
    if (scenes.length < 1) next.scenes = 'Cada cena precisa de mídia e texto narrado.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function save(): void {
    if (!validate()) return
    onSave({
      id: draft.id,
      name: draft.name.trim(),
      mission: draft.mission.trim(),
      tagline: draft.tagline.trim(),
      body: draft.body.trim(),
      image: draft.image.trim(),
      coverPoster: draft.coverPoster.trim() || undefined,
      alt: draft.alt.trim(),
      status: draft.status,
      location: draft.location,
      published: draft.published,
      ratio: draft.ratio.trim() || '1376 / 768',
      facts: draft.facts
        .filter((fact) => fact.label.trim() && fact.value.trim())
        .map((fact) => ({ label: fact.label.trim(), value: fact.value.trim() })),
      scenes: draft.scenes
        .filter((scene) => scene.src.trim() && scene.body.trim())
        .map((scene) => ({
          kind: scene.kind,
          src: scene.src.trim(),
          poster: scene.poster?.trim() || undefined,
          kicker: scene.kicker.trim(),
          body: scene.body.trim(),
          audio: scene.audio?.trim() || undefined,
        })),
    })
  }

  if (!mounted || phase === 'closed') return null

  const transitionClass =
    phase === 'enter-start'
      ? 'form-enter-active form-enter-from'
      : phase === 'enter-end'
        ? 'form-enter-active'
        : phase === 'leave'
          ? 'form-leave-active form-leave-to'
          : ''

  return createPortal(
    <div
      className={transitionClass ? `rform ${transitionClass}` : 'rform'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rform-title"
    >
      <button className="rform__scrim" type="button" aria-label="Fechar" onClick={onClose} />

      <form
        className="rform__sheet"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <header className="rform__head">
          <div className="rform__headText">
            <p className="rform__kicker">{isEdit ? 'Registo existente' : 'Novo registo'}</p>
            <h2 id="rform-title" className="rform__title">{isEdit ? 'Editar relíquia' : 'Nova relíquia'}</h2>
          </div>
          <button type="button" className="rform__x" aria-label="Fechar" onClick={onClose}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
          </button>
        </header>

        <div className="rform__body" data-lenis-prevent>
          <section className="rform__group">
            <div className="rform__groupHead">
              <span className="rform__num">01</span>
              <h3 className="rform__legend">Identidade</h3>
            </div>

            <div className="rform__groupBody">
              <div className="rform__pairRow">
                <label className="rform__field rform__field--wide">
                  <span className="rform__label">Nome da relíquia</span>
                  <input
                    className="rform__input"
                    placeholder="Módulo Lunar Apollo"
                    value={draft.name}
                    onChange={(event) => onName(event.target.value)}
                  />
                  {errors.name ? <span className="rform__err">{errors.name}</span> : null}
                </label>
                <label className="rform__field">
                  <span className="rform__label">Identificador <em>(URL)</em></span>
                  <input
                    className="rform__input rform__input--mono"
                    placeholder="apollo-lunar-module"
                    value={draft.id}
                    onChange={(event) => update({ id: event.target.value })}
                  />
                  {errors.id ? <span className="rform__err">{errors.id}</span> : null}
                </label>
              </div>

              <div className="rform__pairRow">
                <label className="rform__field">
                  <span className="rform__label">Missão</span>
                  <input
                    className="rform__input"
                    placeholder="Apollo 11–17 · 1969–1972"
                    value={draft.mission}
                    onChange={(event) => update({ mission: event.target.value })}
                  />
                  {errors.mission ? <span className="rform__err">{errors.mission}</span> : null}
                </label>
                <label className="rform__field">
                  <span className="rform__label">Frase de efeito</span>
                  <input
                    className="rform__input"
                    placeholder="Seis pousos, seis módulos deixados para trás."
                    value={draft.tagline}
                    onChange={(event) => update({ tagline: event.target.value })}
                  />
                  {errors.tagline ? <span className="rform__err">{errors.tagline}</span> : null}
                </label>
              </div>

              <div className="rform__pairRow">
                <label className="rform__field">
                  <span className="rform__label">Estado</span>
                  <select
                    className="rform__input"
                    value={draft.status}
                    onChange={(event) => update({ status: event.target.value as RelicStatus })}
                  >
                    <option value="active">Activo</option>
                    <option value="silent">Silencioso</option>
                    <option value="lost">Perdido</option>
                  </select>
                </label>
                <label className="rform__field">
                  <span className="rform__label">Local</span>
                  <select
                    className="rform__input"
                    value={draft.location}
                    onChange={(event) => update({ location: event.target.value as RelicLocation })}
                  >
                    <option value="moon">Lua</option>
                    <option value="mars">Marte</option>
                    <option value="deep_space">Espaço profundo</option>
                  </select>
                </label>
                <label className="rform__field">
                  <span className="rform__label">Visibilidade</span>
                  <select
                    className="rform__input"
                    value={draft.published ? 'true' : 'false'}
                    onChange={(event) => update({ published: event.target.value === 'true' })}
                  >
                    <option value="true">Publicado</option>
                    <option value="false">Rascunho</option>
                  </select>
                </label>
              </div>

              <label className="rform__field">
                <span className="rform__label">História</span>
                <textarea
                  className="rform__input rform__area"
                  rows={4}
                  placeholder="O que ficou para trás, contado em duas ou três frases."
                  value={draft.body}
                  onChange={(event) => update({ body: event.target.value })}
                />
                {errors.body ? <span className="rform__err">{errors.body}</span> : null}
              </label>
            </div>
          </section>

          <section className="rform__group">
            <div className="rform__groupHead">
              <span className="rform__num">02</span>
              <h3 className="rform__legend">Cartão</h3>
            </div>

            <div className="rform__groupBody">
              <div className="rform__media">
                <div className="rform__thumb">
                  {draft.image ? (
                    <img src={draft.image} alt={draft.alt || 'Pré-visualização'} onLoad={onImageLoad} />
                  ) : (
                    <span className="rform__thumbEmpty">sem imagem</span>
                  )}
                  <label className="rform__upload">
                    <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
                    <span>{draft.image ? 'Substituir' : 'Enviar imagem'}</span>
                  </label>
                </div>

                <div className="rform__mediaFields">
                  <label className="rform__field">
                    <span className="rform__label">Imagem <em>(URL ou ficheiro)</em></span>
                    <input
                      className="rform__input rform__input--mono"
                      placeholder="/images/relics/nova.jpg"
                      value={draft.image}
                      onChange={(event) => update({ image: event.target.value })}
                    />
                    {errors.image ? <span className="rform__err">{errors.image}</span> : null}
                  </label>

                  <div className="rform__pairRow">
                    <label className="rform__field">
                      <span className="rform__label">Texto alternativo</span>
                      <input
                        className="rform__input"
                        placeholder="Descrição da imagem"
                        value={draft.alt}
                        onChange={(event) => update({ alt: event.target.value })}
                      />
                      {errors.alt ? <span className="rform__err">{errors.alt}</span> : null}
                    </label>
                    {coverIsVideo ? (
                      <label className="rform__field">
                        <span className="rform__label">Poster da capa <em>(vídeo)</em></span>
                        <input
                          className="rform__input rform__input--mono"
                          placeholder="/images/relics/poster.jpg"
                          value={draft.coverPoster}
                          onChange={(event) => update({ coverPoster: event.target.value })}
                        />
                      </label>
                    ) : null}
                    <label className="rform__field">
                      <span className="rform__label">Proporção <em>(automática)</em></span>
                      <input
                        className="rform__input rform__input--mono"
                        placeholder="1376 / 768"
                        value={draft.ratio}
                        onChange={(event) => update({ ratio: event.target.value })}
                      />
                      {errors.ratio ? <span className="rform__err">{errors.ratio}</span> : null}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rform__group">
            <div className="rform__groupHead">
              <span className="rform__num">03</span>
              <h3 className="rform__legend">Ficha técnica</h3>
              <button type="button" className="rform__add" onClick={addFact}>+ linha</button>
            </div>

            <div className="rform__groupBody">
              {draft.facts.map((fact, i) => (
                <div key={`fact-${i}`} className="rform__factRow">
                  <input
                    className="rform__input"
                    placeholder="Rótulo — Primeiro pouso"
                    value={fact.label}
                    onChange={(event) => setFact(i, 'label', event.target.value)}
                  />
                  <input
                    className="rform__input"
                    placeholder="Valor — 20 jul 1969"
                    value={fact.value}
                    onChange={(event) => setFact(i, 'value', event.target.value)}
                  />
                  <button
                    type="button"
                    className="rform__del"
                    aria-label={`Remover linha ${i + 1}`}
                    onClick={() => removeFact(i)}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
                  </button>
                </div>
              ))}
              {errors.facts ? <span className="rform__err">{errors.facts}</span> : null}
            </div>
          </section>

          <section className="rform__group">
            <div className="rform__groupHead">
              <span className="rform__num">04</span>
              <h3 className="rform__legend">Cenas <em>(narradas)</em></h3>
              <button type="button" className="rform__add" onClick={addScene}>+ cena</button>
            </div>

            <div className="rform__groupBody">
              {draft.scenes.map((scene, i) => (
                <article key={`scene-${i}`} className="rform__scene">
                  <header className="rform__sceneHead">
                    <span className="rform__sceneNum">Cena {String(i + 1).padStart(2, '0')}</span>
                    <div className="rform__sceneTools">
                      <div className="rform__segment" role="group" aria-label="Tipo de mídia">
                        <button
                          type="button"
                          className={scene.kind === 'image' ? 'is-on' : undefined}
                          onClick={() => setScene(i, { kind: 'image' })}
                        >Imagem</button>
                        <button
                          type="button"
                          className={scene.kind === 'video' ? 'is-on' : undefined}
                          onClick={() => setScene(i, { kind: 'video' })}
                        >Vídeo</button>
                      </div>
                      {draft.scenes.length > 1 ? (
                        <button
                          type="button"
                          className="rform__del"
                          aria-label={`Remover cena ${i + 1}`}
                          onClick={() => removeScene(i)}
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
                        </button>
                      ) : null}
                    </div>
                  </header>

                  <div className="rform__pairRow">
                    <label className="rform__field">
                      <span className="rform__label">{scene.kind === 'video' ? 'Vídeo' : 'Imagem'} <em>(URL ou ficheiro)</em></span>
                      <input
                        className="rform__input rform__input--mono"
                        placeholder="/media/loop.mp4"
                        value={scene.src}
                        onChange={(event) => setScene(i, { src: event.target.value })}
                      />
                    </label>
                    <label className="rform__field">
                      <span className="rform__label">Etiqueta</span>
                      <input
                        className="rform__input"
                        placeholder="Fotografia / Transmissão"
                        value={scene.kicker}
                        onChange={(event) => setScene(i, { kicker: event.target.value })}
                      />
                    </label>
                  </div>

                  {scene.kind === 'video' ? (
                    <label className="rform__field">
                      <span className="rform__label">Poster do vídeo</span>
                      <input
                        className="rform__input rform__input--mono"
                        placeholder="/images/relics/poster.jpg"
                        value={scene.poster ?? ''}
                        onChange={(event) => setScene(i, { poster: event.target.value })}
                      />
                    </label>
                  ) : null}

                  <label className="rform__field">
                    <span className="rform__label">Áudio narrado <em>(opcional)</em></span>
                    <input
                      className="rform__input rform__input--mono"
                      placeholder="/media/narracao.mp3"
                      value={scene.audio ?? ''}
                      onChange={(event) => setScene(i, { audio: event.target.value })}
                    />
                  </label>

                  <label className="rform__field">
                    <span className="rform__label">Texto narrado</span>
                    <textarea
                      className="rform__input rform__area"
                      rows={3}
                      placeholder="O que o diário conta nesta cena."
                      value={scene.body}
                      onChange={(event) => setScene(i, { body: event.target.value })}
                    />
                  </label>
                </article>
              ))}
              {errors.scenes ? <span className="rform__err">{errors.scenes}</span> : null}
            </div>
          </section>
        </div>

        <footer className="rform__foot">
          <p className="rform__footNote">Guardado neste dispositivo.</p>
          {errors.general ? <span className="rform__err">{errors.general}</span> : null}
          <div className="rform__actions">
            <button type="button" className="rform__cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="rform__save">{isEdit ? 'Guardar alterações' : 'Criar relíquia'}</button>
          </div>
        </footer>
      </form>
    </div>,
    document.body,
  )
}
