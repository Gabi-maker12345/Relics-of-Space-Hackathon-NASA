import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await supabase
    .from('relics')
    .insert(body)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  return data
})
