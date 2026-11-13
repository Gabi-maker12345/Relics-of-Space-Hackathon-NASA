import { defineEventHandler } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPublicRelicDetail } from '../../../utils/publicRelics'

/** Direct /public/relics/:slug route alias for /api/public/relics/:slug. */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  return getPublicRelicDetail(supabase, event)
})
