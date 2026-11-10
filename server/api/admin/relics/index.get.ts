import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await supabase
    .from('relics')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  return data ?? []
})
