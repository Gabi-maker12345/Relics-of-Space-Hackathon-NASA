import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import { importNasaMedia, NasaApiError, nasaImportSchema } from '../../../../../utils/nasa'
import { ADMIN_RELIC_OPTIONS, loadRelicDto } from '../../../../../utils/relicMapper'

/**
 * Imports one NASA item as a media row. The asset is referenced by its official
 * URL (no copy), with `credit` and `source_url` filled automatically.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = nasaImportSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  try {
    const result = await importNasaMedia(supabase, relic, parsed.data.nasa_id)
    if (result.error) throw createError({ statusCode: 400, message: result.error })
  }
  catch (error) {
    if (error instanceof NasaApiError) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }
    throw error
  }

  const fresh = await findRelic(supabase, relic.id)
  return loadRelicDto(supabase, fresh ?? relic, ADMIN_RELIC_OPTIONS)
})
