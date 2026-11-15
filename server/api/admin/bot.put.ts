import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../utils/auth'
import { botSettingsInputSchema, saveBotSettings } from '../../utils/bot'

/** Grava prompt/instruções/catálogos do Zénite Bot (bucket privado `config`). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parsed = botSettingsInputSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Configuração inválida.' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  return saveBotSettings(supabase, parsed.data)
})
