import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { QuizQuestion } from '#shared/types/relic'

type RelicRow = Database['public']['Tables']['relics']['Row']
type QuizRow = Database['public']['Tables']['quiz_questions']['Row']
type QuizInsert = Database['public']['Tables']['quiz_questions']['Insert']
type QuizUpdate = Database['public']['Tables']['quiz_questions']['Update']

/** Default quiz size: 8 questions × 15 points = 120. */
export const MAX_QUIZ_QUESTIONS = 8

const questionSchema = z.string()
  .trim()
  .min(1, 'A pergunta não pode estar vazia.')
  .max(1000, 'A pergunta é demasiado longa.')

const optionSchema = z.string()
  .trim()
  .min(1, 'Cada opção precisa de texto.')
  .max(500, 'Cada opção é demasiado longa.')

const optionsSchema = z.array(optionSchema)
  .min(2, 'O quiz precisa de pelo menos 2 opções.')
  .max(5, 'O quiz pode ter no máximo 5 opções.')

const positionSchema = z.number().int().min(0).max(100)

export const quizQuestionInputSchema = z.object({
  question: questionSchema,
  options: optionsSchema,
  correct_index: z.number().int().min(0, 'O índice da resposta tem de ser >= 0.'),
  explanation: z.string().trim().max(4000).optional(),
  position: positionSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.correct_index >= value.options.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['correct_index'],
      message: 'O índice da resposta tem de apontar para uma opção existente.',
    })
  }
})

/**
 * Patch schema. `position` is accepted only so the endpoint can reject it with
 * a pointer to the order endpoint instead of silently ignoring it.
 */
export const quizQuestionPatchSchema = z.object({
  question: questionSchema.optional(),
  options: optionsSchema.optional(),
  correct_index: z.number().int().min(0).optional(),
  explanation: z.string().trim().max(4000).optional(),
  position: positionSchema.optional(),
})

export const quizOrderSchema = z.object({
  ids: z.array(z.string().uuid('Identificador de pergunta inválido.'))
    .min(1, 'A ordem precisa de pelo menos uma pergunta.'),
})

export const quizBulkSchema = z.object({
  questions: z.array(quizQuestionInputSchema)
    .min(1, 'O quiz precisa de pelo menos uma pergunta.')
    .max(MAX_QUIZ_QUESTIONS, `Uma relíquia pode ter no máximo ${MAX_QUIZ_QUESTIONS} perguntas.`),
})

export type ParsedQuizBulk = z.infer<typeof quizBulkSchema>

export type ParsedQuizQuestionInput = z.infer<typeof quizQuestionInputSchema>
export type ParsedQuizQuestionPatch = z.infer<typeof quizQuestionPatchSchema>

function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    }
    catch {
      return []
    }
  }
  return []
}

/** Maps one row to the API shape. Answers are only included for the admin. */
export function quizRowToDto(row: QuizRow, includeAnswer = false): QuizQuestion {
  return {
    id: row.id,
    position: row.position,
    question: row.question,
    options: parseOptions(row.options),
    explanation: row.explanation || '',
    ...(includeAnswer ? { correct_index: row.correct_index } : {}),
  }
}

/** Loads the quiz of one relic in display order. */
export async function questionsOfRelic(
  client: SupabaseClient<Database>,
  relicId: string,
): Promise<QuizRow[]> {
  const { data } = await client
    .from('quiz_questions')
    .select('*')
    .eq('relic_id', relicId)
    .order('position')
  return data ?? []
}

export async function findQuestion(
  client: SupabaseClient<Database>,
  questionId: string,
): Promise<QuizRow | null> {
  const { data } = await client
    .from('quiz_questions')
    .select('*')
    .eq('id', questionId)
    .maybeSingle()
  return data
}

export interface QuizMutationResult {
  error?: string
  question?: QuizRow
}

export interface QuizDto {
  relic_id: string
  slug: string
  quiz: QuizQuestion[]
}

/** Admin payload: the whole quiz of the relic, answers included. */
export async function loadQuizDto(
  client: SupabaseClient<Database>,
  relic: RelicRow,
): Promise<QuizDto> {
  const rows = await questionsOfRelic(client, relic.id)
  return {
    relic_id: relic.id,
    slug: relic.slug,
    quiz: rows.map(row => quizRowToDto(row, true)),
  }
}

async function restorePositions(
  client: SupabaseClient<Database>,
  positions: Map<string, number>,
): Promise<void> {
  // quiz_questions has a unique (relic_id, position): move everything to a
  // temporary range first, then back, so swaps never collide.
  const temporary = new Map([...positions.keys()].map((id, index) => [id, 10_000 + index]))
  for (const [id, position] of temporary) {
    await client.from('quiz_questions').update({ position }).eq('id', id)
  }
  for (const [id, position] of positions) {
    await client.from('quiz_questions').update({ position }).eq('id', id)
  }
}

/**
 * Appends a question (or inserts it at `position`, shifting the rest).
 * A relic is capped at {@link MAX_QUIZ_QUESTIONS}.
 */
export async function addQuestion(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  input: ParsedQuizQuestionInput,
): Promise<QuizMutationResult> {
  const existing = await questionsOfRelic(client, relic.id)
  if (existing.length >= MAX_QUIZ_QUESTIONS) {
    return { error: `Uma relíquia pode ter no máximo ${MAX_QUIZ_QUESTIONS} perguntas.` }
  }

  const lastPosition = existing.reduce((max, item) => Math.max(max, item.position), -1)
  const position = Math.min(Math.max(input.position ?? lastPosition + 1, 0), lastPosition + 1)
  const shifted = existing.filter(item => item.position >= position)

  // Shift downwards (highest position first) because positions are unique.
  const shiftedDone: QuizRow[] = []
  for (const item of [...shifted].sort((a, b) => b.position - a.position)) {
    const { error } = await client
      .from('quiz_questions')
      .update({ position: item.position + 1 })
      .eq('id', item.id)
    if (error) {
      await restorePositions(client, new Map(shiftedDone.map(row => [row.id, row.position])))
      return { error: error.message }
    }
    shiftedDone.push(item)
  }

  const payload: QuizInsert = {
    relic_id: relic.id,
    question: input.question,
    options: input.options,
    correct_index: input.correct_index,
    explanation: input.explanation ?? '',
    position,
  }

  const { data, error } = await client
    .from('quiz_questions')
    .insert(payload)
    .select()
    .single()

  if (error || !data) {
    await restorePositions(client, new Map(shifted.map(item => [item.id, item.position])))
    return { error: error?.message ?? 'Falha ao criar a pergunta.' }
  }

  return { question: data }
}

/** Updates one question; validates `correct_index` against the merged options. */
export async function updateQuestion(
  client: SupabaseClient<Database>,
  question: QuizRow,
  input: ParsedQuizQuestionPatch,
): Promise<QuizMutationResult> {
  const options = input.options ?? parseOptions(question.options)
  const correctIndex = input.correct_index ?? question.correct_index

  if (correctIndex >= options.length) {
    return { error: 'O índice da resposta tem de apontar para uma opção existente.' }
  }

  const patch: QuizUpdate = {}
  if (input.question !== undefined) patch.question = input.question
  if (input.options !== undefined) patch.options = input.options
  if (input.correct_index !== undefined) patch.correct_index = input.correct_index
  if (input.explanation !== undefined) patch.explanation = input.explanation

  if (Object.keys(patch).length === 0) return { question }

  const { data, error } = await client
    .from('quiz_questions')
    .update(patch)
    .eq('id', question.id)
    .select()
    .single()

  if (error || !data) return { error: error?.message ?? 'Falha ao atualizar a pergunta.' }
  return { question: data }
}

/** Deletes one question. Translations cascade with it. */
export async function deleteQuestion(
  client: SupabaseClient<Database>,
  question: QuizRow,
): Promise<QuizMutationResult> {
  const { error } = await client.from('quiz_questions').delete().eq('id', question.id)
  return error ? { error: error.message } : {}
}

/**
 * Replaces the whole quiz in one write. Used by the admin editor (manual save)
 * and by the AI generator, so both paths end with positions 0..n-1.
 *
 * supabase-js has no transaction: the previous rows are re-inserted if the new
 * insert fails.
 */
export async function replaceQuiz(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  questions: ParsedQuizQuestionInput[],
): Promise<QuizMutationResult> {
  const previous = await questionsOfRelic(client, relic.id)

  const { error: deleteError } = await client.from('quiz_questions').delete().eq('relic_id', relic.id)
  if (deleteError) return { error: deleteError.message }

  if (questions.length === 0) return {}

  const rows: QuizInsert[] = questions.map((input, position) => ({
    relic_id: relic.id,
    question: input.question,
    options: input.options,
    correct_index: input.correct_index,
    explanation: input.explanation ?? '',
    position,
  }))

  const { error } = await client.from('quiz_questions').insert(rows)
  if (error) {
    if (previous.length > 0) {
      await client
        .from('quiz_questions')
        .insert(previous.map(row => ({ ...row })) as QuizInsert[])
    }
    return { error: error.message }
  }

  return {}
}

/**
 * Rewrites positions from the caller's full ordered id list. The list must
 * match the relic exactly, so a stale admin tab cannot drop questions.
 */
export async function reorderQuestions(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  ids: string[],
): Promise<QuizMutationResult> {
  const existing = await questionsOfRelic(client, relic.id)
  const existingIds = new Set(existing.map(item => item.id))
  const unique = new Set(ids)

  if (ids.length !== existing.length || unique.size !== ids.length) {
    return { error: 'A ordem tem de incluir todas as perguntas da relíquia, sem repetições.' }
  }
  if (ids.some(id => !existingIds.has(id))) {
    return { error: 'A ordem inclui perguntas que não pertencem a esta relíquia.' }
  }

  const previous = new Map(existing.map(item => [item.id, item.position]))

  // Two passes: free the target positions first, then write the final order.
  for (const [index, id] of ids.entries()) {
    const { error } = await client
      .from('quiz_questions')
      .update({ position: 10_000 + index })
      .eq('id', id)
    if (error) {
      await restorePositions(client, previous)
      return { error: error.message }
    }
  }

  for (const [position, id] of ids.entries()) {
    const { error } = await client
      .from('quiz_questions')
      .update({ position })
      .eq('id', id)
    if (error) {
      await restorePositions(client, previous)
      return { error: error.message }
    }
  }

  return {}
}
