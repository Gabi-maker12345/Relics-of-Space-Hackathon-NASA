import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const paths = Array.isArray(body?.paths) ? body.paths : []
  if (paths.length === 0) return { ok: true }

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.storage.from('relic-media').remove(paths)
  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }
  return { ok: true }
})
