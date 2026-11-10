import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const MAX_SIZES = {
  image: 5 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 100 * 1024 * 1024,
} as const

const MIME_MAP = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, message: 'Ficheiro em falta' })

  const filePart = form.find(p => p.name === 'file')
  const relicId = form.find(p => p.name === 'relicId')?.data?.toString() || 'common'
  const kind = (form.find(p => p.name === 'kind')?.data?.toString() || 'image') as keyof typeof MAX_SIZES

  if (!filePart || !filePart.data) throw createError({ statusCode: 400, message: 'Ficheiro em falta' })
  if (!MAX_SIZES[kind]) throw createError({ statusCode: 400, message: 'Tipo inválido' })

  const mime = filePart.type || ''
  if (!(MIME_MAP[kind] as readonly string[]).includes(mime)) {
    throw createError({ statusCode: 400, message: 'Tipo MIME não permitido' })
  }

  if (filePart.data.length > MAX_SIZES[kind]) {
    throw createError({ statusCode: 400, message: 'Ficheiro demasiado grande' })
  }

  const ext = path.extname(filePart.filename || '') || (kind === 'image' ? '.jpg' : kind === 'audio' ? '.mp3' : '.mp4')
  const safeName = `${randomUUID()}${ext.toLowerCase()}`
  const key = `relics/${relicId}/${kind === 'image' ? 'images' : kind === 'audio' ? 'audio' : 'videos'}/${safeName}`

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.storage.from('relic-media').upload(key, filePart.data, {
    contentType: mime,
    upsert: false,
  })

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  const { data } = supabase.storage.from('relic-media').getPublicUrl(key)
  return { url: data.publicUrl, path: key }
})
