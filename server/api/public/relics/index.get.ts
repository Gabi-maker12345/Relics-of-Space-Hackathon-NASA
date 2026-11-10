import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await supabase
    .from('relics')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  return data ?? []
})
