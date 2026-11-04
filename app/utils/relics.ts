import type { Relic, RelicLocation, RelicStatus } from '~/data/relics'

const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)(?:[?#].*)?$/i

/** A capa é vídeo? Basta a extensão — sem campo extra no modelo. */
export function isVideoUrl(url: string | undefined | null): boolean {
  return typeof url === 'string' && VIDEO_EXT.test(url)
}

export const STATUS_LABEL: Record<RelicStatus, string> = {
  active: 'Activo',
  silent: 'Silencioso',
  lost: 'Perdido',
}

export const LOCATION_LABEL: Record<RelicLocation, string> = {
  moon: 'Lua',
  mars: 'Marte',
  deep_space: 'Espaço profundo',
}

export const relicStatus = (relic: Relic): RelicStatus => relic.status ?? 'active'
export const relicLocation = (relic: Relic): RelicLocation => relic.location ?? 'moon'
export const isPublished = (relic: Relic): boolean => relic.published !== false
