'use client'

import { useMemo } from 'react'

export function ForgeCta({ label, onClick }: { label: string; onClick?: () => void }) {
  const letters = useMemo(
    () =>
      [...label].map((letter, index) => ({
        key: `${letter}-${index}`,
        char: letter === ' ' ? '\u00A0' : letter,
        delay: `${(index * 0.02).toFixed(2)}s`,
      })),
    [label],
  )

  return (
    <button type="button" className="fr-cta" onClick={onClick}>
      <span>
        {letters.map((letter) => (
          <span key={letter.key} style={{ transitionDelay: letter.delay }}>
            {letter.char}
          </span>
        ))}
      </span>
    </button>
  )
}
