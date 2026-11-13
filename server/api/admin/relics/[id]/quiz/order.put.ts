import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import { loadQuizDto, quizOrderSchema, reorderQuestions } from '../../../../../utils/quiz'

/**
 * Rewrites the quiz order. The payload must list every question id of the relic
 * exactly once, so a stale admin tab cannot silently drop questions.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = quizOrderSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await reorderQuestions(supabase, relic, parsed.data.ids)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return loadQuizDto(supabase, relic)
})
