import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type {
  QuizQuestion,
  Relic,
  RelicLocation,
  RelicPanelItem,
  RelicScene,
  RelicStatus,
  RelicStep,
  RelicWarning,
  SceneKind,
} from '#shared/types/relic'
import { DEFAULT_LANG, normalizeLang } from './i18n'

type RelicRow = Database['public']['Tables']['relics']['Row']
type FactRow = Database['public']['Tables']['relic_facts']['Row']
type MediaRow = Database['public']['Tables']['relic_media']['Row']
type QuizRow = Database['public']['Tables']['quiz_questions']['Row']
type RelicTranslationRow = Database['public']['Tables']['relic_translations']['Row']
type MediaTranslationRow = Database['public']['Tables']['media_translations']['Row']
type QuizTranslationRow = Database['public']['Tables']['quiz_question_translations']['Row']

export const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'

/** Sorts media rows by their stored position, stably. */
function sortMedia(media: MediaRow[]): MediaRow[] {
  return [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

/**
 * The narration script consumed by the front-end scroll executor: one intro
 * step plus one step per media item, already ordered.
 */
export function buildSteps(relic: RelicRow, media: MediaRow[]): RelicStep[] {
  const sortedMedia = sortMedia(media)

  const steps: RelicStep[] = [{
    index: 0,
    type: 'intro',
    title: relic.name,
    caption: relic.summary || relic.story_text || relic.name,
    audio_url: relic.intro_audio_url ?? null,
  }]

  sortedMedia.forEach((item, position) => {
    steps.push({
      index: position + 1,
      type: item.type as SceneKind,
      media_id: item.id,
      title: item.title || item.kicker || relic.name,
      caption: item.caption || '',
      audio_url: item.audio_url ?? null,
      src: item.url,
      poster: item.poster_url || undefined,
      credit: item.credit || '',
    })
  })

  return steps
}

/**
 * Non-blocking admin hints: the narration executor can run without these
 * fields, but the result is worse. They are never validation errors.
 */
export function buildWarnings(media: MediaRow[]): RelicWarning[] {
  const warnings: RelicWarning[] = []

  for (const item of sortMedia(media)) {
    const label = item.title || item.kicker || 'Mídia'
    if (!item.audio_url?.trim()) {
      warnings.push({
        code: 'media_missing_audio',
        media_id: item.id,
        message: `"${label}" não tem áudio próprio.`,
      })
    }
    if (!item.caption.trim()) {
      warnings.push({
        code: 'media_missing_caption',
        media_id: item.id,
        message: `"${label}" não tem legenda/narração escrita.`,
      })
    }
  }

  return warnings
}

export interface MapRelicOptions {
  /** Admin responses carry warnings; public ones do not need them. */
  includeWarnings?: boolean
  /** Language requested (e.g. 'en'). Defaults to 'pt' (base columns). */
  lang?: string
}

/**
 * Overlays localized fields over the base relic row, falling back to the base values (PT)
 * when a localized field is missing or empty.
 */
export function applyRelicTranslation(
  relic: RelicRow,
  translation?: RelicTranslationRow | null,
): RelicRow {
  if (!translation) return relic

  return {
    ...relic,
    name: translation.name?.trim() || relic.name,
    mission: translation.mission?.trim() || relic.mission,
    summary: translation.summary?.trim() || relic.summary,
    story_text: translation.story_text?.trim() || relic.story_text,
    alt: translation.alt?.trim() || relic.alt,
    intro_audio_url: translation.intro_audio_url?.trim() || relic.intro_audio_url,
  }
}

/**
 * Overlays localized captions, titles, and audio URLs over media rows, falling back to the base items.
 */
export function applyMediaTranslations(
  media: MediaRow[],
  translations: MediaTranslationRow[] = [],
): MediaRow[] {
  if (!translations.length) return media

  const transByMedia = new Map(translations.map(t => [t.media_id, t]))

  return media.map((item) => {
    const trans = transByMedia.get(item.id)
    if (!trans) return item

    return {
      ...item,
      caption: trans.caption?.trim() || item.caption,
      title: trans.title?.trim() || item.title,
      kicker: trans.kicker?.trim() || item.kicker,
      audio_url: trans.audio_url?.trim() || item.audio_url,
    }
  })
}

/**
 * Overlays localized questions, options, and explanations over quiz questions.
 */
export function applyQuizTranslations(
  quiz: QuizRow[],
  translations: QuizTranslationRow[] = [],
): QuizRow[] {
  if (!translations.length) return quiz

  const transByQuestion = new Map(translations.map(t => [t.question_id, t]))

  return quiz.map((item) => {
    const trans = transByQuestion.get(item.id)
    if (!trans) return item

    return {
      ...item,
      question: trans.question?.trim() || item.question,
      explanation: trans.explanation?.trim() || item.explanation,
      options: (trans.options && Array.isArray(trans.options) && trans.options.length > 0)
        ? trans.options
        : item.options,
    }
  })
}

/**
 * Turns database rows into the `Relic` shape the front-end consumes.
 *
 * The public identifier is always the slug: UUIDs never leak into the UI, so
 * URLs stay stable and readable. Media ids are exposed inside `scenes` because
 * the admin needs them to edit, reorder and delete individual items.
 */
export function mapDbToRelic(
  relic: RelicRow,
  facts: FactRow[] = [],
  media: MediaRow[] = [],
  options: MapRelicOptions = {},
  quiz: QuizRow[] = [],
): Relic {
  const sortedFacts = [...facts].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const sortedMedia = sortMedia(media)
  const sortedQuiz = [...quiz].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  // The cover may be any media type. Only fall back to the first item when the
  // stored cover was deleted or never set.
  const coverMedia = sortedMedia.find(m => m.id === relic.cover_media_id)
    ?? sortedMedia.find(m => m.type === 'image')
    ?? sortedMedia[0]

  const scenes: RelicScene[] = sortedMedia.map(m => ({
    id: m.id,
    kind: m.type as SceneKind,
    src: m.url,
    poster: m.poster_url || undefined,
    kicker: m.kicker || m.title || '',
    title: m.title || '',
    body: m.caption || '',
    credit: m.credit || '',
    source_url: m.source_url,
    audio_url: m.audio_url,
    mute_video: m.mute_video,
    is_cover: coverMedia?.id === m.id,
  }))

  const steps = buildSteps(relic, sortedMedia)

  const quizQuestions: QuizQuestion[] = sortedQuiz.map(q => ({
    id: q.id,
    position: q.position,
    question: q.question,
    options: Array.isArray(q.options)
      ? (q.options as string[])
      : typeof q.options === 'string'
        ? JSON.parse(q.options)
        : [],
    explanation: q.explanation || '',
  }))

  return {
    id: relic.slug,
    name: relic.name,
    mission: relic.mission || '',
    tagline: relic.summary || '',
    body: relic.story_text || relic.summary || '',
    status: (relic.status || 'active') as RelicStatus,
    location: (relic.location || 'moon') as RelicLocation,
    facts: sortedFacts.map(f => ({ label: f.label, value: f.value })),
    // A video cover is represented by its poster frame: `<img>` cannot play it.
    image: coverMedia ? (coverMedia.type === 'video' ? coverMedia.poster_url ?? '' : coverMedia.url) : '',
    alt: relic.alt || relic.name,
    ratio: relic.ratio || '1376 / 768',
    scenes,
    steps,
    total_steps: steps.length,
    quiz: quizQuestions,
    warnings: options.includeWarnings ? buildWarnings(sortedMedia) : undefined,
    intro_audio_url: relic.intro_audio_url,
    published: relic.published,
  }
}

export type RelicPanelSource = Pick<
  RelicRow,
  'slug' | 'name' | 'summary' | 'status' | 'location' | 'mission' | 'ratio'
>

/**
 * Maps a relic row and its resolved cover media into the lightweight shape
 * used by the public home panels.
 */
export function mapDbToRelicPanel(
  relic: RelicPanelSource,
  coverMedia?: Pick<MediaRow, 'type' | 'url' | 'poster_url'> | null,
): RelicPanelItem {
  const coverType = coverMedia ? (coverMedia.type as SceneKind) : null
  const image = coverMedia
    ? (coverMedia.type === 'video' ? coverMedia.poster_url ?? '' : coverMedia.url)
    : ''

  return {
    id: relic.slug,
    slug: relic.slug,
    name: relic.name,
    summary: relic.summary || '',
    tagline: relic.summary || '',
    status: (relic.status || 'active') as RelicStatus,
    location: (relic.location || 'moon') as RelicLocation,
    mission: relic.mission || '',
    ratio: relic.ratio || '1376 / 768',
    image,
    cover_type: coverType,
    cover: coverMedia
      ? {
          type: coverType!,
          url: coverMedia.url,
          poster_url: coverMedia.poster_url,
        }
      : null,
    facts: [],
  }
}

/** Loads facts, media, quiz questions and optional translations for a relic and returns the mapped object. */
export async function loadRelicDto(
  supabase: SupabaseClient<Database>,
  relic: RelicRow,
  options: MapRelicOptions = {},
): Promise<Relic> {
  const [factsRes, mediaRes, quizRes] = await Promise.all([
    supabase.from('relic_facts').select('*').eq('relic_id', relic.id).order('position'),
    supabase.from('relic_media').select('*').eq('relic_id', relic.id).order('position'),
    supabase.from('quiz_questions').select('*').eq('relic_id', relic.id).order('position'),
  ])

  let effectiveRelic = relic
  let effectiveMedia = mediaRes.data ?? []
  let effectiveQuiz = quizRes.data ?? []

  const requestedLang = options.lang === undefined ? undefined : normalizeLang(options.lang)
  if (requestedLang && requestedLang !== DEFAULT_LANG) {
    const mediaIds = effectiveMedia.map(m => m.id)
    const quizIds = effectiveQuiz.map(q => q.id)

    const [relicTransRes, mediaTransRes, quizTransRes] = await Promise.all([
      supabase.from('relic_translations').select('*').eq('relic_id', relic.id).eq('lang', requestedLang).maybeSingle(),
      mediaIds.length > 0
        ? supabase.from('media_translations').select('*').in('media_id', mediaIds).eq('lang', requestedLang)
        : Promise.resolve({ data: [] }),
      quizIds.length > 0
        ? supabase.from('quiz_question_translations').select('*').in('question_id', quizIds).eq('lang', requestedLang)
        : Promise.resolve({ data: [] }),
    ])

    effectiveRelic = applyRelicTranslation(effectiveRelic, relicTransRes.data)
    effectiveMedia = applyMediaTranslations(effectiveMedia, (mediaTransRes.data ?? []) as MediaTranslationRow[])
    effectiveQuiz = applyQuizTranslations(effectiveQuiz, (quizTransRes.data ?? []) as QuizTranslationRow[])
  }

  return mapDbToRelic(effectiveRelic, factsRes.data ?? [], effectiveMedia, options, effectiveQuiz)
}
