import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { findRelic } from '../../../utils/relicInput'
import { deleteMedia, findMedia } from '../../../utils/media'
import { loadRelicDto } from '../../../utils/relicMapper'

/**
 * Removes one media item. If it was the cover, the FK sets the cover pointer
 * to null and the mapper falls back to the first remaining image.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = serverSupabaseServiceRole<Database>(event)
  const media = await findMedia(supabase, id)
  if (!media) throw createError({ statusCode: 404, message: 'Media not found' })

  const relic = await findRelic(supabase, media.relic_id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await deleteMedia(supabase, media)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  const fresh = await findRelic(supabase, relic.id)
  return loadRelicDto(supabase, fresh ?? relic, { includeWarnings: true })
})
