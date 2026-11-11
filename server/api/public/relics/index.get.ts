import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { loadRelicDto } from '../../../utils/relicMapper'

/**
 * Public listing. Uses the anon client so RLS decides what is visible: drafts
 * never depend on us remembering to filter.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  const { data: relics, error } = await supabase
    .from('relics')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true })

  if (error || !relics) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  return Promise.all(relics.map(relic => loadRelicDto(supabase, relic)))
})
