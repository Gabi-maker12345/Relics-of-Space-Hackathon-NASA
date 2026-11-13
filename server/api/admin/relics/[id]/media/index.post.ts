import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import { addMedia, mediaInputSchema } from '../../../../../utils/media'
import { ADMIN_RELIC_OPTIONS, loadRelicDto } from '../../../../../utils/relicMapper'

/**
 * Adds a media item to a relic. Any number of items is allowed; omitting
 * `position` appends at the end. `is_cover: true` also makes it the cover.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = mediaInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await addMedia(supabase, relic, parsed.data)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  const fresh = await findRelic(supabase, relic.id)
  return loadRelicDto(supabase, fresh ?? relic, ADMIN_RELIC_OPTIONS)
})
