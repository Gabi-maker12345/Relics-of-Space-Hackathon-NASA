import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { slugify, ensureUniqueSlug } from '../../../utils/slug'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  mission: z.string().optional(),
  summary: z.string().optional(),
  story_text: z.string().optional(),
  status: z.enum(['active', 'silent', 'lost']).optional(),
  location: z.enum(['moon', 'mars', 'deep_space']).optional(),
  published: z.boolean().optional(),
  intro_audio_url: z.string().optional(),
  alt: z.string().optional(),
  ratio: z.string().optional(),
  cover_media_id: z.string().uuid().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Dados inválidos' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const baseSlug = parsed.data.slug || slugify(parsed.data.name)
  const slug = await ensureUniqueSlug(supabase, baseSlug)

  const { data, error } = await supabase
    .from('relics')
    .insert({ ...parsed.data, slug })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  return data
})
