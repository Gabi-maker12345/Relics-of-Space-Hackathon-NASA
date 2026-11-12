/**
 * Contract shared by the front-end and the API.
 *
 * `Relic` is exactly what `/api/public/relics` and `/api/admin/relics` return.
 * `RelicInput` is what the admin form sends. Keeping both in `shared/` stops
 * the two sides from drifting apart again.
 */

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

export type RelicStatus = 'active' | 'silent' | 'lost'
export type RelicLocation = 'moon' | 'mars' | 'deep_space'

export interface Relic {
  /** Stable public identifier — the slug, never the database UUID. */
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
  published: boolean
}

export interface RelicInput {
  /** Optional on create (derived from the name); edited only when the user changes it. */
  slug?: string
  name: string
  mission?: string
  tagline?: string
  body?: string
  /** Card cover. Must match one of the scenes when present. */
  image?: string
  alt?: string
  ratio?: string
  published?: boolean
  status?: RelicStatus
  location?: RelicLocation
  intro_audio_url?: string
  facts?: RelicFact[]
  scenes?: RelicScene[]
}
