'use client'

type BotNarratorProps = {
  talking?: boolean
}

export function BotNarrator({ talking = false }: BotNarratorProps) {
  return (
    <div className={`bot bot-enter ${talking ? 'is-talking' : 'is-idle'}`} aria-hidden="true">
      <div className="bot__inner">
        <img
          className={`bot__img bot__img--talk${talking ? ' is-on' : ''}`}
          src="/images/rover-talking.webp"
          alt=""
          decoding="async"
        />
        <img
          className={`bot__img bot__img--idle${talking ? '' : ' is-on'}`}
          src="/images/rover-static.webp"
          alt=""
          decoding="async"
        />
      </div>
    </div>
  )
}
