import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { findRelic } from '../../../utils/relicInput'
import { findQuestion, loadQuizDto, quizQuestionPatchSchema, updateQuestion } from '../../../utils/quiz'

/**
 * Edits one quiz question. The options and `correct_index` are validated
 * together, so changing the options cannot leave the answer out of range.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = quizQuestionPatchSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }
  if (parsed.data.position !== undefined) {
    throw createError({
      statusCode: 400,
      message: 'Usa PUT /api/admin/relics/:id/quiz/order para alterar a ordem.',
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const question = await findQuestion(supabase, id)
  if (!question) throw createError({ statusCode: 404, message: 'Question not found' })

  const relic = await findRelic(supabase, question.relic_id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await updateQuestion(supabase, question, parsed.data)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return loadQuizDto(supabase, relic)
})
