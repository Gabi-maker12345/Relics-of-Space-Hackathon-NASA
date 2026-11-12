import { defineEventHandler, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { loadRelicDto } from '../../../utils/relicMapper'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data: relics, error } = await supabase
    .from('relics')
    .select('*')
    .order('created_at', { ascending: true })
    .order('name', { ascending: true })

  if (error || !relics) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  return Promise.all(relics.map(relic => loadRelicDto(supabase, relic)))
})
