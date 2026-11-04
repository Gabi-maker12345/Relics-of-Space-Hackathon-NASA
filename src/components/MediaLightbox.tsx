'use client'

import { useEffect, useRef } from 'react'
import type { RelicScene } from '@/data/relics'

type MediaLightboxProps = {
  media: RelicScene
  onClose: () => void
}

export function MediaLightbox({ media, onClose }: MediaLightboxProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const caption = media.kicker

  useEffect(() => {
    void videoRef.current?.play().catch(() => undefined)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="lightbox lb-enter" role="dialog" aria-modal="true" aria-label={caption} data-lenis-prevent>
      <button type="button" className="lightbox__scrim" aria-label="Fechar" onClick={onClose} />
      <div className="lightbox__stage">
        {media.kind === 'video' ? (
          <video
            ref={videoRef}
            className="lightbox__media"
            src={media.src}
            poster={media.poster}
            controls
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img className="lightbox__media" src={media.src} alt={caption} />
        )}
      </div>
      <div className="lightbox__bar">
        <span className="lightbox__label">{caption}</span>
        <button type="button" className="lightbox__close" aria-label="Fechar" onClick={onClose}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
