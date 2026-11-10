import type { Database } from '~/types/database.types'

type RelicRow = Database['public']['Tables']['relics']['Row']
type FactRow = Database['public']['Tables']['relic_facts']['Row']
type MediaRow = Database['public']['Tables']['relic_media']['Row']

export interface RelicFact {
  label: string
  value: string
}

export type SceneKind = 'image' | 'video'

export interface RelicScene {
  kind: SceneKind
  src: string
  poster?: string
  kicker: string
  body: string
}

export interface Relic {
  id: string
  name: string
  mission: string
  tagline: string
  body: string
  facts: RelicFact[]
  image: string
  alt: string
  ratio: string
  scenes: RelicScene[]
}

export function mapDbToRelic(
  relic: RelicRow,
  facts: FactRow[] = [],
  media: MediaRow[] = [],
): Relic {
  const sortedFacts = [...facts].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const sortedMedia = [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const coverMedia = sortedMedia.find(m => m.id === relic.cover_media_id) || sortedMedia[0]

  const scenes: RelicScene[] = sortedMedia.map((m) => ({
    kind: m.type as SceneKind,
    src: m.url,
    poster: m.poster_url || undefined,
    kicker: m.kicker || m.title || '',
    body: m.caption || '',
  }))

  return {
    id: relic.id,
    name: relic.name,
    mission: relic.mission || '',
    tagline: relic.summary || '',
    body: relic.story_text || relic.summary || '',
    facts: sortedFacts.map(f => ({
      label: f.label,
      value: f.value,
    })),
    image: coverMedia?.url || relic.intro_audio_url || '',
    alt: relic.alt || relic.name,
    ratio: relic.ratio || '1376 / 768',
    scenes,
  }
}
