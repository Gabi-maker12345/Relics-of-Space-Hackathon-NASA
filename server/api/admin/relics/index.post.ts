import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { slugify, ensureUniqueSlug } from '../../../utils/slug'
import {
  relicInputSchema,
  replaceRelicChildren,
  toRelicInsert,
  validateCover,
} from '../../../utils/relicInput'
import { loadRelicDto } from '../../../utils/relicMapper'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const parsed = relicInputSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const coverError = validateCover(parsed.data.scenes, parsed.data.image)
  if (coverError) throw createError({ statusCode: 400, message: coverError })

  const supabase = serverSupabaseServiceRole<Database>(event)
  const slug = await ensureUniqueSlug(supabase, parsed.data.slug || slugify(parsed.data.name))

  const { data: created, error } = await supabase
    .from('relics')
    .insert(toRelicInsert(parsed.data, slug))
    .select()
    .single()

  if (error || !created) {
    throw createError({ statusCode: 400, message: error?.message ?? 'Falha ao criar relíquia' })
  }

  const children = await replaceRelicChildren(supabase, created.id, {
    facts: parsed.data.facts ?? [],
    scenes: parsed.data.scenes ?? [],
    cover: parsed.data.image,
  })

  if (children.error) {
    // Do not leave a half-created relic behind.
    await supabase.from('relics').delete().eq('id', created.id)
    throw createError({ statusCode: 400, message: children.error })
  }

  let relic = created
  if (children.coverMediaId !== undefined) {
    const { data: withCover, error: coverWriteError } = await supabase
      .from('relics')
      .update({ cover_media_id: children.coverMediaId })
      .eq('id', created.id)
      .select()
      .single()

    if (coverWriteError || !withCover) {
      throw createError({ statusCode: 500, message: coverWriteError?.message ?? 'Falha ao definir a capa' })
    }
    relic = withCover
  }

  return loadRelicDto(supabase, relic)
})
