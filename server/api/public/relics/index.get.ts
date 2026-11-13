import { defineEventHandler } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPublicRelicsList } from '../../../utils/publicRelics'

/**
 * Public panel listing (BE-08).
 * Uses the anon client and returns only lightweight panel fields.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  return getPublicRelicsList(supabase, event)
})
