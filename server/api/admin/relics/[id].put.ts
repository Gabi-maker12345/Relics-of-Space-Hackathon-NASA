import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { ensureUniqueSlug } from '../../../utils/slug'
import {
  findRelic,
  relicPatchSchema,
  replaceRelicChildren,
  toRelicPatch,
  validateCover,
} from '../../../utils/relicInput'
import { loadRelicDto } from '../../../utils/relicMapper'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const body = await readBody(event)
  const parsed = relicPatchSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const existing = await findRelic(supabase, id)
  if (!existing) throw createError({ statusCode: 404, message: 'Relic not found' })

  const coverError = validateCover(parsed.data.scenes, parsed.data.image)
  if (coverError) throw createError({ statusCode: 400, message: coverError })

  const patch = toRelicPatch(parsed.data)

  // The slug is stable: it only changes when the user edits the identifier.
  // Renaming a relic must not silently break its URL.
  if (parsed.data.slug !== undefined) {
    patch.slug = await ensureUniqueSlug(supabase, parsed.data.slug, existing.id)
  }

  let relic = existing
  if (Object.keys(patch).length > 0) {
    const { data: updated, error } = await supabase
      .from('relics')
      .update(patch)
      .eq('id', existing.id)
      .select()
      .single()

    if (error || !updated) {
      throw createError({ statusCode: 400, message: error?.message ?? 'Falha ao atualizar relíquia' })
    }
    relic = updated
  }

  const children = await replaceRelicChildren(supabase, existing.id, {
    facts: parsed.data.facts,
    scenes: parsed.data.scenes,
    cover: parsed.data.image,
  })

  if (children.error) {
    throw createError({ statusCode: 400, message: children.error })
  }

  if (children.coverMediaId !== undefined) {
    const { data: withCover, error: coverWriteError } = await supabase
      .from('relics')
      .update({ cover_media_id: children.coverMediaId })
      .eq('id', existing.id)
      .select()
      .single()

    if (coverWriteError || !withCover) {
      throw createError({ statusCode: 500, message: coverWriteError?.message ?? 'Falha ao definir a capa' })
    }
    relic = withCover
  }

  return loadRelicDto(supabase, relic, { includeWarnings: true })
})
