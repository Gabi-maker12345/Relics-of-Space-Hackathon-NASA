import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import { addQuestion, loadQuizDto, quizQuestionInputSchema } from '../../../../../utils/quiz'

/**
 * Adds one quiz question to a relic. Omit `position` to append; the relic is
 * capped at five questions. Invalid `correct_index` is rejected before writing.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = quizQuestionInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await addQuestion(supabase, relic, parsed.data)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return loadQuizDto(supabase, relic)
})
