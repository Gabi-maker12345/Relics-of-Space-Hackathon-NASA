import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await supabase
    .from('relics')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, message: 'Relic not found' })
  }

  return data
})
