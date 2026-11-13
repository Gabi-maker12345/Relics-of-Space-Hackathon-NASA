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

/**
 * One media item of a relic. The admin uses `id` to edit/reorder/delete the
 * row; the public pages only read the presentation fields.
 */
export interface RelicScene {
  /** Database id of the media row. Stable for the lifetime of the item. */
  id?: string
  kind: SceneKind
  src: string
  poster?: string
  kicker: string
  /** Short heading shown above the caption. */
  title?: string
  body: string
  /** Attribution shown next to the media. */
  credit?: string
  /** Original source of the media (NASA page, archive, …). */
  source_url?: string | null
  /** Per-item narration. Falls back to the relic intro when absent. */
  audio_url?: string | null
  /** Only meaningful for videos: keep them silent while the narration plays. */
  mute_video?: boolean
  /** True for the single media item used as the relic cover. */
  is_cover?: boolean
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
  /** Cover image. When the cover is a video this is its poster frame. */
  image: string
  alt: string
  ratio: string
  scenes: RelicScene[]
  /** Narration played before the first step. */
  intro_audio_url?: string | null
  published: boolean
}

export interface RelicInput {
  /** Optional on create (derived from the name); edited only when the user changes it. */
  slug?: string
  name: string
  mission?: string
  tagline?: string
  body?: string
  /** Cover URL: a scene `src` or, for video covers, the scene poster. */
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

/** Body accepted by `POST /api/admin/relics/:id/media`. */
export interface MediaInput {
  kind: SceneKind
  src: string
  poster?: string | null
  kicker?: string
  title?: string
  body?: string
  credit?: string
  source_url?: string | null
  audio_url?: string | null
  mute_video?: boolean
  /** Marks this item as the cover (the previous cover is unset). */
  is_cover?: boolean
  /** Omit to append at the end of the list. */
  position?: number
}

/** Body accepted by `PATCH /api/admin/media/:id`. */
export type MediaPatch = Partial<MediaInput>

/** Body accepted by `PUT /api/admin/relics/:id/media/order`. */
export interface MediaOrderInput {
  /**
   * Every media id of the relic, exactly once, in the new order. Sending a
   * partial list is rejected so a stale admin tab cannot delete rows.
   */
  ids: string[]
}

/** Body accepted by `PUT /api/admin/relics/:id/cover`. */
export interface MediaCoverInput {
  /** Media id, or `null` to leave the relic without an explicit cover. */
  media_id: string | null
}
