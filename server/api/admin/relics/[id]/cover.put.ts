import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../utils/auth'
import { findRelic } from '../../../../utils/relicInput'
import { mediaCoverSchema, setCover } from '../../../../utils/media'
import { ADMIN_RELIC_OPTIONS, loadRelicDto } from '../../../../utils/relicMapper'

/**
 * Sets (or clears) the relic cover. Accepts image and video media: for a
 * video the DTO exposes its poster frame as `image`.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = mediaCoverSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await setCover(supabase, relic, parsed.data.media_id)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  const fresh = await findRelic(supabase, relic.id)
  return loadRelicDto(supabase, fresh ?? relic, ADMIN_RELIC_OPTIONS)
})
