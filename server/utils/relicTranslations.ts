import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type {
  MediaTranslationInput,
  QuizTranslationInput,
  RelicTranslationInput,
} from '#shared/types/relic'

type RelicTranslationRow = Database['public']['Tables']['relic_translations']['Row']
type RelicTranslationInsert = Database['public']['Tables']['relic_translations']['Insert']
type MediaTranslationRow = Database['public']['Tables']['media_translations']['Row']
type MediaTranslationInsert = Database['public']['Tables']['media_translations']['Insert']
type QuizTranslationRow = Database['public']['Tables']['quiz_question_translations']['Row']
type QuizTranslationInsert = Database['public']['Tables']['quiz_question_translations']['Insert']

/** Absolute http(s) URLs or site-relative paths (`/images/...`), like media.ts. */
const optionalAssetUrl = z.string()
  .trim()
  .max(2048)
  .refine(
    value => value === '' || value.startsWith('/') || /^https?:\/\//i.test(value),
    'Use um URL http(s) ou um caminho começado por /.',
  )
  .optional()
  .nullable()

const mediaTranslationSchema = z.object({
  media_id: z.string().uuid('Identificador de mídia inválido.'),
  kicker: z.string().trim().max(200).optional(),
  title: z.string().trim().max(300).optional(),
  caption: z.string().max(4000).optional(),
  audio_url: optionalAssetUrl,
})

const quizTranslationSchema = z.object({
  question_id: z.string().uuid('Identificador de pergunta inválido.'),
  question: z.string().trim().max(1000).optional(),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(5).optional(),
  explanation: z.string().max(4000).optional(),
})

export const relicTranslationInputSchema = z.object({
  name: z.string().trim().max(300).optional(),
  mission: z.string().trim().max(300).optional(),
  summary: z.string().max(4000).optional(),
  story_text: z.string().max(20_000).optional(),
  alt: z.string().max(1000).optional(),
  intro_audio_url: optionalAssetUrl,
  media: z.array(mediaTranslationSchema).max(200).optional(),
  quiz: z.array(quizTranslationSchema).max(100).optional(),
})

export type ParsedRelicTranslationInput = z.infer<typeof relicTranslationInputSchema>

export interface RelicTranslations {
  relic: RelicTranslationRow | null
  media: MediaTranslationRow[]
  quiz: QuizTranslationRow[]
}

export interface SaveTranslationsResult {
  error?: string
  saved?: {
    relic: boolean
    media: number
    quiz: number
  }
}

function nullableUrl(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === '') return null
  return value
}

/** Rejects ids that do not exist or belong to another relic. */
async function assertOwnership(
  client: SupabaseClient<Database>,
  table: 'relic_media' | 'quiz_questions',
  relicId: string,
  ids: string[],
): Promise<string | null> {
  if (ids.length === 0) return null

  if (new Set(ids).size !== ids.length) {
    return table === 'relic_media'
      ? 'Uma mídia aparece mais de uma vez no pedido.'
      : 'Uma pergunta aparece mais de uma vez no pedido.'
  }

  const { data, error } = await client.from(table).select('id').eq('relic_id', relicId).in('id', ids)
  if (error) return error.message

  const found = new Set((data ?? []).map(row => row.id))
  const missing = ids.filter(id => !found.has(id))
  if (missing.length === 0) return null

  return table === 'relic_media'
    ? 'Uma ou mais mídias não pertencem a esta relíquia.'
    : 'Uma ou mais perguntas não pertencem a esta relíquia.'
}

/** Loads every translation row of one relic in one language. */
export async function getRelicTranslations(
  client: SupabaseClient<Database>,
  relicId: string,
  lang: string,
): Promise<RelicTranslations> {
  const [relicRes, mediaRes, quizRes] = await Promise.all([
    client.from('relic_translations').select('*').eq('relic_id', relicId).eq('lang', lang).maybeSingle(),
    client.from('relic_media').select('id').eq('relic_id', relicId),
    client.from('quiz_questions').select('id').eq('relic_id', relicId),
  ])

  const mediaIds = (mediaRes.data ?? []).map(row => row.id)
  const quizIds = (quizRes.data ?? []).map(row => row.id)

  const [mediaTrans, quizTrans] = await Promise.all([
    mediaIds.length > 0
      ? client.from('media_translations').select('*').eq('lang', lang).in('media_id', mediaIds)
      : Promise.resolve({ data: [] as MediaTranslationRow[] }),
    quizIds.length > 0
      ? client.from('quiz_question_translations').select('*').eq('lang', lang).in('question_id', quizIds)
      : Promise.resolve({ data: [] as QuizTranslationRow[] }),
  ])

  return {
    relic: relicRes.data ?? null,
    media: mediaTrans.data ?? [],
    quiz: quizTrans.data ?? [],
  }
}

/**
 * Saves one language of a relic, merging with what already exists.
 *
 * `PUT` is used by the admin form, but every field is optional so saving one
 * tab never wipes fields managed by another. Explicit `null` clears a URL.
 * Media/question ids are checked against the relic before any write.
 */
export async function saveRelicTranslations(
  client: SupabaseClient<Database>,
  relicId: string,
  lang: string,
  input: ParsedRelicTranslationInput,
): Promise<SaveTranslationsResult> {
  const mediaInput: MediaTranslationInput[] = input.media ?? []
  const quizInput: QuizTranslationInput[] = input.quiz ?? []

  const [mediaError, quizError] = await Promise.all([
    assertOwnership(client, 'relic_media', relicId, mediaInput.map(item => item.media_id)),
    assertOwnership(client, 'quiz_questions', relicId, quizInput.map(item => item.question_id)),
  ])
  if (mediaError || quizError) return { error: mediaError || quizError || undefined }

  const [relicRes, mediaRes, quizRes] = await Promise.all([
    client.from('relic_translations').select('*').eq('relic_id', relicId).eq('lang', lang).maybeSingle(),
    mediaInput.length > 0
      ? client.from('media_translations').select('*').eq('lang', lang).in('media_id', mediaInput.map(item => item.media_id))
      : Promise.resolve({ data: [] as MediaTranslationRow[] }),
    quizInput.length > 0
      ? client.from('quiz_question_translations').select('*').eq('lang', lang).in('question_id', quizInput.map(item => item.question_id))
      : Promise.resolve({ data: [] as QuizTranslationRow[] }),
  ])

  const currentRelic = relicRes.data
  const relicFields: RelicTranslationInput = {
    name: input.name,
    mission: input.mission,
    summary: input.summary,
    story_text: input.story_text,
    alt: input.alt,
    intro_audio_url: input.intro_audio_url,
  }
  const hasRelicChanges = Object.values(relicFields).some(value => value !== undefined)
  let savedRelic = false

  if (hasRelicChanges || currentRelic) {
    const payload: RelicTranslationInsert = {
      relic_id: relicId,
      lang,
      name: input.name !== undefined ? input.name : currentRelic?.name ?? null,
      mission: input.mission !== undefined ? input.mission : currentRelic?.mission ?? null,
      summary: input.summary !== undefined ? input.summary : currentRelic?.summary ?? null,
      story_text: input.story_text !== undefined ? input.story_text : currentRelic?.story_text ?? null,
      alt: input.alt !== undefined ? input.alt : currentRelic?.alt ?? null,
      intro_audio_url: input.intro_audio_url !== undefined
        ? nullableUrl(input.intro_audio_url)
        : currentRelic?.intro_audio_url ?? null,
    }

    const { error } = await client
      .from('relic_translations')
      .upsert(payload, { onConflict: 'relic_id,lang' })
    if (error) return { error: error.message }
    savedRelic = true
  }

  const currentMedia = new Map((mediaRes.data ?? []).map(row => [row.media_id, row]))
  const mediaPayloads: MediaTranslationInsert[] = []
  for (const item of mediaInput) {
    const current = currentMedia.get(item.media_id)
    const hasChanges = item.kicker !== undefined
      || item.title !== undefined
      || item.caption !== undefined
      || item.audio_url !== undefined
    if (!hasChanges && !current) continue

    mediaPayloads.push({
      media_id: item.media_id,
      lang,
      kicker: item.kicker !== undefined ? item.kicker : current?.kicker ?? null,
      title: item.title !== undefined ? item.title : current?.title ?? null,
      caption: item.caption !== undefined ? item.caption : current?.caption ?? null,
      audio_url: item.audio_url !== undefined
        ? nullableUrl(item.audio_url)
        : current?.audio_url ?? null,
    })
  }

  if (mediaPayloads.length > 0) {
    const { error } = await client
      .from('media_translations')
      .upsert(mediaPayloads, { onConflict: 'media_id,lang' })
    if (error) return { error: error.message }
  }

  const currentQuiz = new Map((quizRes.data ?? []).map(row => [row.question_id, row]))
  const quizPayloads: QuizTranslationInsert[] = []
  for (const item of quizInput) {
    const current = currentQuiz.get(item.question_id)
    const hasChanges = item.question !== undefined
      || item.options !== undefined
      || item.explanation !== undefined
    if (!hasChanges && !current) continue

    quizPayloads.push({
      question_id: item.question_id,
      lang,
      question: item.question !== undefined ? item.question : current?.question ?? null,
      options: item.options !== undefined ? item.options : current?.options ?? null,
      explanation: item.explanation !== undefined ? item.explanation : current?.explanation ?? null,
    })
  }

  if (quizPayloads.length > 0) {
    const { error } = await client
      .from('quiz_question_translations')
      .upsert(quizPayloads, { onConflict: 'question_id,lang' })
    if (error) return { error: error.message }
  }

  return {
    saved: {
      relic: savedRelic,
      media: mediaPayloads.length,
      quiz: quizPayloads.length,
    },
  }
}
