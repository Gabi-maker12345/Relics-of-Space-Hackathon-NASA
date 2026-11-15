import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../utils/auth'
import { loadBotSettings } from '../../utils/bot'

/** Configuração do Zénite Bot para o modal do admin. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  return loadBotSettings(supabase)
})
