import { defineEventHandler } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPublicRelicsList } from '../../../utils/publicRelics'

/** Direct /public/relics route alias for /api/public/relics. */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  return getPublicRelicsList(supabase, event)
})
