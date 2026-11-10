import { defineEventHandler } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient<Database>(event)
    if (supabase?.auth?.signOut) {
      await supabase.auth.signOut().catch(() => {})
    }
  }
  catch {
    /* ignore */
  }
  return { ok: true }
})
