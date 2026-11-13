import { defineEventHandler } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { getPublicRelicDetail } from '../../../utils/publicRelics'

/**
 * Public detail by slug (or UUID for backward compatibility) (BE-08).
 * Returns the full technical sheet, steps, scenes, and quiz questions.
 * Returns 404 for nonexistent or draft relics.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  return getPublicRelicDetail(supabase, event)
})
