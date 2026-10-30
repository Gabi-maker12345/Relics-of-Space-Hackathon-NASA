/**
 * Choreografia extraída do bundle original (constante interna `Kp`),
 * mais os tempos do "hole" (portal) e do cursor custom.
 * Tempos em segundos, deslocamentos em fração do elemento.
 */
export type ChoreoStep = {
  at: number
  dur: number
  ease: 'folio' | 'expoOut' | 'expoIn' | 'power1out' | 'power2out' | 'power2inout' | 'power3out' | 'power4out'
  stagger?: number
}

export const CHOREO = {
  // página (featured)
  flight: { at: 0, dur: 1, ease: 'folio' } as ChoreoStep,
  back: { at: 0, dur: 1, ease: 'folio' } as ChoreoStep,
  stack: { at: 0.25, dur: 1.25, ease: 'expoOut', stagger: 0.1 } as ChoreoStep,
  stackRise: 0.5, // fração da altura do card
  title: { at: 0.25, dur: 1.25, ease: 'expoOut', stagger: 0.075 } as ChoreoStep,
  text: { at: 0.35, dur: 1.1, ease: 'expoOut', stagger: 0.075 } as ChoreoStep,
  pills: { at: 0.5, dur: 0.85, ease: 'expoOut', stagger: 0.075 } as ChoreoStep,
  cards: { at: 0.1, dur: 1.25, ease: 'expoOut', stagger: 0.05 } as ChoreoStep,
  cardsFrom: 0.5,
  // interações
  cardHover: { dur: 0.5, outDur: 0.5, ease: 'expoOut', outEase: 'expoOut' },
  pillHover: { dur: 0.7, outDur: 0.5, ease: 'expoOut', outEase: 'expoOut' },
  linkHover: { dur: 0.3, ease: 'power2out' }, // u_alpha *.6 no original
  linkHoverDim: 0.6,
  // hole / portal
  holeOpen: { dur: 0.85, ease: 'folio' } as { dur: number; ease: 'folio' },
  holeClose: { dur: 0.65, ease: 'folio' } as { dur: number; ease: 'folio' },
  holeScaleIn: { dur: 0.3, ease: 'power2out' } as { dur: number; ease: 'power2out' },
  holeScaleOut: { dur: 0.25, ease: 'power2out' } as { dur: number; ease: 'power2out' },
  holeGrid: { dur: 0.3, ease: 'power2out' } as { dur: number; ease: 'power2out' },
  holeDelay: 0.2, // atraso dos textos do painel (ay/oy)
  // cursor custom
  cursorIn: { dur: 0.35, ease: 'power2out' } as { dur: number; ease: 'power2out' },
  cursorOut: { dur: 0.25, ease: 'power2out' } as { dur: number; ease: 'power2out' },
} as const
