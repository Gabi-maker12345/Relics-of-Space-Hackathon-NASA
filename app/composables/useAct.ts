import { getSmoothScroll } from './useSmoothScroll'

export type Act = 'page' | 'cosmos' | 'scene'

let wired = false

/**
 * Segundo acto da página: o arquivo termina no CTA; a partir daí a experiência
 * acontece num overlay fixo (cosmos → cena 3D), com o scroll da página travado.
 */
export function useAct() {
  const act = useState<Act>('act', () => 'page')

  const lockPage = (locked: boolean) => {
    if (!import.meta.client) return
    const lenis = getSmoothScroll()
    if (locked) {
      lenis?.stop()
      document.documentElement.classList.add('is-gated')
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.classList.remove('is-gated')
      lenis?.start()
    }
  }

  const open = (): void => {
    if (act.value !== 'page') return
    act.value = 'cosmos'
    lockPage(true)
    document.documentElement.dataset.act = 'cosmos'
    // o clique é o gesto que autoriza o áudio; a trilha entra muda
    void useSoundtrack().prime()
  }

  const enter = async (): Promise<void> => {
    if (act.value !== 'cosmos') return
    act.value = 'scene'
    lockPage(true)
    document.documentElement.dataset.act = 'scene'
    document.documentElement.dataset.scene = 'portfolio'
    await nextTick()
    const engine = useGlEngine()
    engine.scan()
    const track = document.querySelector<HTMLElement>('[data-carousel]')
    if (track) {
      engine.attachTrack(track)
      engine.resetCarousel()
    }
    // cartões novos nascem escondidos: dispara a entrada com a coreografia
    engine.enterAll()
    void useSoundtrack().play()
  }

  const back = (): void => {
    if (act.value === 'page') return
    act.value = 'page'
    delete document.documentElement.dataset.act
    delete document.documentElement.dataset.scene
    lockPage(false)
    useSoundtrack().stop()
    const archive = document.querySelector<HTMLElement>('.fr-archive')
    if (archive) {
      window.scrollTo({ top: archive.offsetTop + archive.offsetHeight - window.innerHeight })
    }
  }

  if (import.meta.client && !wired) {
    wired = true
    // roda para baixo dentro do cosmos leva à cena 3D (uma vez)
    window.addEventListener(
      'wheel',
      (event) => {
        if (act.value !== 'cosmos') return
        if (event.deltaY > 24) {
          event.preventDefault()
          void enter()
        }
      },
      { passive: false },
    )
    window.addEventListener('keydown', (event) => {
      // FE-21: o teclado atravessa o cosmos (a roda não é o único caminho)
      if (act.value === 'cosmos' && ['ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) {
        event.preventDefault()
        void enter()
        return
      }
      if (event.key !== 'Escape' || act.value === 'page') return
      // com um diário aberto, o Escape pertence ao modal (fecha-o primeiro)
      if (document.querySelector('[data-modal]')) return
      back()
    })
  }

  return { act, open, enter, back }
}
