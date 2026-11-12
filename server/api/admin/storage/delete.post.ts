import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { isSafeStoragePath } from '../../../utils/upload'

const MAX_PATHS_PER_REQUEST = 100

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event).catch(() => ({}))
  const paths = Array.isArray(body?.paths) ? body.paths : []
  if (paths.length === 0) return { ok: true }

  if (paths.length > MAX_PATHS_PER_REQUEST) {
    throw createError({
      statusCode: 400,
      message: `Máximo de ${MAX_PATHS_PER_REQUEST} ficheiros por pedido.`,
    })
  }

  // Only paths inside `relics/` may be deleted: a typo must never be able to
  // wipe unrelated objects from the bucket.
  const invalid = paths.filter((path: unknown) => !isSafeStoragePath(path))
  if (invalid.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'Caminho de armazenamento inválido.',
    })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.storage.from('relic-media').remove(paths)
  if (error) {
    throw createError({ statusCode: 502, message: error.message })
  }
  return { ok: true, removed: paths.length }
})
