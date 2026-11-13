import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { findRelic } from '../../../utils/relicInput'
import { findMedia, mediaPatchSchema, updateMedia } from '../../../utils/media'
import { ADMIN_RELIC_OPTIONS, loadRelicDto } from '../../../utils/relicMapper'

/**
 * Edits a media item: caption, credit, per-item audio, mute flag, cover flag.
 * The media id is stable, so the admin can edit one item without resending
 * the whole relic.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = mediaPatchSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }
  if (parsed.data.position !== undefined) {
    throw createError({
      statusCode: 400,
      message: 'Usa PUT /api/admin/relics/:id/media/order para alterar a ordem.',
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const media = await findMedia(supabase, id)
  if (!media) throw createError({ statusCode: 404, message: 'Media not found' })

  const relic = await findRelic(supabase, media.relic_id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const result = await updateMedia(supabase, relic, media, parsed.data)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  const fresh = await findRelic(supabase, relic.id)
  return loadRelicDto(supabase, fresh ?? relic, ADMIN_RELIC_OPTIONS)
})
