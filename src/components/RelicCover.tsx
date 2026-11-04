'use client'

import { isVideoUrl } from '@/utils/relics'

interface RelicCoverProps {
  src: string
  poster?: string
  alt: string
  autoplay?: boolean
  className?: string
}

export function RelicCover({ src, poster, alt, autoplay = false, className }: RelicCoverProps) {
  const video = isVideoUrl(src)
  const classes = className ? `cover ${className}` : 'cover'

  if (video) {
    return (
      <video
        className={classes}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay={autoplay}
        preload={autoplay ? 'auto' : 'metadata'}
        aria-label={alt}
      />
    )
  }

  return <img className={classes} src={src} alt={alt} loading="lazy" decoding="async" />
}
