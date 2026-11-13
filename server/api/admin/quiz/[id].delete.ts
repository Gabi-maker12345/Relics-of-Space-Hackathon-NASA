import { createError, defineEventHandler, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { findRelic } from '../../../utils/relicInput'
import { deleteQuestion, findQuestion, loadQuizDto } from '../../../utils/quiz'

/** Removes one question; its translations cascade with it. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = serverSupabaseServiceRole<Database>(event)
  const question = await findQuestion(supabase, id)
  if (!question) throw createError({ statusCode: 404, message: 'Question not found' })

  const relic = await findRelic(supabase, question.relic_id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await deleteQuestion(supabase, question)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return loadQuizDto(supabase, relic)
})
