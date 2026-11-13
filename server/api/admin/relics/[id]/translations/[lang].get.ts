import { createError, defineEventHandler, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import { langSchema } from '../../../../../utils/i18n'
import { getRelicTranslations } from '../../../../../utils/relicTranslations'

/**
 * Returns every translation row of a relic in one language. The admin uses
 * this to pre-fill the language tab before saving (BE-12).
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

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const translations = await getRelicTranslations(supabase, relic.id, parsedLang.data)

  return {
    relic_id: relic.id,
    slug: relic.slug,
    lang: parsedLang.data,
    ...translations,
  }
})
