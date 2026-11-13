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

export type StepType = 'intro' | SceneKind

/**
 * One scroll step of the narration executor: the intro followed by one step
 * per media item, in display order.
 */
export interface RelicStep {
  /** Zero-based position; `100 / total_steps` gives the scroll percentage. */
  index: number
  type: StepType
  title: string
  caption: string
  audio_url: string | null
  /** Media id, absent on the intro step. */
  media_id?: string
  /** Asset to display for media steps. */
  src?: string
  poster?: string
  credit?: string
}

/** Non-blocking admin hint (the relic can still be published). */
export interface RelicWarning {
  code: 'media_missing_audio' | 'media_missing_caption'
  message: string
  media_id?: string
}

export interface QuizQuestion {
  id: string
  position: number
  question: string
  options: string[]
  explanation?: string
  /**
   * Index of the correct option. Only present on admin responses; the public
   * detail deliberately omits it so the answer never reaches the browser.
   */
  correct_index?: number
}

/** Body accepted by `POST /api/admin/relics/:id/quiz`. */
export interface QuizQuestionInput {
  question: string
  options: string[]
  correct_index: number
  explanation?: string
  /** Omit to append at the end of the relic's quiz. */
  position?: number
}

/** Body accepted by `PATCH /api/admin/quiz/:id`. */
export type QuizQuestionPatch = Partial<QuizQuestionInput>

/** Body accepted by `PUT /api/admin/relics/:id/quiz/order`. */
export interface QuizOrderInput {
  /** Every question id of the relic, exactly once, in the new order. */
  ids: string[]
}

export interface RelicPanelCover {
  type: SceneKind
  url: string
  poster_url?: string | null
}

export interface RelicPanelItem {
  /** Stable public identifier — the slug, never the database UUID. */
  id: string
  slug: string
  name: string
  summary: string
  tagline: string
  status: RelicStatus
  location: RelicLocation
  mission: string
  image: string
  cover_type: SceneKind | null
  cover: RelicPanelCover | null
  ratio: string
  facts: RelicFact[]
}

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
  /** Ordered narration script: intro + one step per media item. */
  steps: RelicStep[]
  /** `steps.length`, for `100 / total_steps`. */
  total_steps: number
  /** Only present on admin responses. */
  warnings?: RelicWarning[]
  /** Narration played before the first step. */
  intro_audio_url?: string | null
  published: boolean
  status?: RelicStatus
  location?: RelicLocation
  quiz?: QuizQuestion[]
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

/** A media translation inside `PUT /api/admin/relics/:id/translations/:lang`. */
export interface MediaTranslationInput {
  media_id: string
  kicker?: string
  title?: string
  caption?: string
  /** Localized narration for this item; `null` clears it. */
  audio_url?: string | null
}

/** A quiz translation inside `PUT /api/admin/relics/:id/translations/:lang`. */
export interface QuizTranslationInput {
  question_id: string
  question?: string
  options?: string[]
  explanation?: string
}

/**
 * Body accepted by `PUT /api/admin/relics/:id/translations/:lang`.
 *
 * Every field is optional and missing fields keep their previous value, so the
 * admin can save one language tab at a time without erasing the others.
 */
export interface RelicTranslationInput {
  name?: string
  mission?: string
  summary?: string
  story_text?: string
  alt?: string
  /** `null` clears the localized intro audio. */
  intro_audio_url?: string | null
  media?: MediaTranslationInput[]
  quiz?: QuizTranslationInput[]
}
