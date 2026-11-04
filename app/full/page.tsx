'use client'

import { useRelics } from '@/hooks/useRelics'

export default function FullPage() {
  const { relics } = useRelics()

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-40 py-25 s:px-80 s:py-40">
      <h2 data-gl="text" className="text-35 tracking-[-0.035em] leading-14 [-webkit-text-fill-color:transparent]">
        Arquivo
      </h2>
      <p data-gl="text" className="label opacity-60 mt-15 [-webkit-text-fill-color:transparent]">
        — as relíquias que continuam lá fora
      </p>
      <ul className="flex list-none flex-col gap-y-8 mt-25 s:mt-30">
        {relics.map((relic) => (
          <li key={relic.id} className="border-b border-white/10 pb-10">
            <p data-gl="text" className="label flex items-center justify-between [-webkit-text-fill-color:transparent]">
              <span className="text-16 s:text-18 tracking-[-0.05em]">{relic.name}</span>
              <span className="opacity-50">{relic.mission}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
