import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import { langSchema } from '../../../../../utils/i18n'
import { relicTranslationInputSchema, saveRelicTranslations } from '../../../../../utils/relicTranslations'

/**
 * Saves one language of a relic. Missing fields keep their current value, so
 * the admin can save one tab without erasing the others (BE-12).
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  const rawLang = getRouterParam(event, 'lang')

  if (!id || !rawLang) throw createError({ statusCode: 400, message: 'Missing id or lang' })

  const parsedLang = langSchema.safeParse(rawLang)
  if (!parsedLang.success) {
    throw createError({ statusCode: 400, message: parsedLang.error.issues[0]?.message })
  }

  const body = await readBody(event)
  const parsed = relicTranslationInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados de tradução inválidos.' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await saveRelicTranslations(supabase, relic.id, parsedLang.data, parsed.data)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return {
    ok: true,
    relic_id: relic.id,
    slug: relic.slug,
    lang: parsedLang.data,
    saved: result.saved,
  }
})
