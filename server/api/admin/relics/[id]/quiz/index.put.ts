import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import { loadQuizDto, quizBulkSchema, replaceQuiz } from '../../../../../utils/quiz'

/**
 * Replaces the entire quiz of a relic (admin editor + AI generation).
 * Positions are rewritten to 0..n-1 and the cap is MAX_QUIZ_QUESTIONS (8).
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = quizBulkSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await replaceQuiz(supabase, relic, parsed.data.questions)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return loadQuizDto(supabase, relic)
})
