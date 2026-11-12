import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { findRelic } from '../../../utils/relicInput'

const STORAGE_FOLDERS = ['images', 'audio', 'videos'] as const

/**
 * Best-effort removal of the relic's media from Storage. Database rows are
 * cascaded by Postgres; objects in the bucket are not, so without this they
 * would become orphans. A Storage hiccup must not fail the delete itself.
 */
async function removeRelicMedia(
  supabase: SupabaseClient<Database>,
  relic: { id: string, slug: string },
): Promise<string[]> {
  const removed: string[] = []
  const bucket = supabase.storage.from('relic-media')

  // Uploads may be filed under the slug (new relics) or the UUID (older ones).
  for (const folderId of new Set([relic.id, relic.slug])) {
    for (const folder of STORAGE_FOLDERS) {
      const prefix = `relics/${folderId}/${folder}`
      const { data: objects } = await bucket.list(prefix, { limit: 1000 })
      if (!objects?.length) continue

      const paths = objects.map(object => `${prefix}/${object.name}`)
      const { error } = await bucket.remove(paths)
      if (!error) removed.push(...paths)
    }
  }

  return removed
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const { error } = await supabase
    .from('relics')
    .delete()
    .eq('id', relic.id)

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  let removedFiles: string[] = []
  try {
    removedFiles = await removeRelicMedia(supabase, relic)
  }
  catch {
    // Orphaned objects are preferable to a failed delete.
  }

  return { ok: true, removedFiles }
})
