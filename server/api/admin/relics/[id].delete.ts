import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { error } = await supabase
    .from('relics')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  return { ok: true }
})
