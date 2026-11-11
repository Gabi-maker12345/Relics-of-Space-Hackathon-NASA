import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import {
  MAX_SERVER_UPLOAD_BYTES,
  buildStoragePath,
  extensionForMime,
  isUploadKind,
  normalizeRelicId,
  validateUpload,
} from '../../../utils/upload'

/**
 * Direct upload for small files (tests, scripts, avatars).
 *
 * Vercel caps function request bodies at 4.5 MB, so larger uploads must use
 * `POST /api/admin/upload/sign` and talk to Storage from the browser.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, message: 'Ficheiro em falta' })

  const filePart = form.find(part => part.name === 'file')
  if (!filePart || !filePart.data || filePart.data.length === 0) {
    throw createError({ statusCode: 400, message: 'Ficheiro em falta' })
  }

  const kindRaw = form.find(part => part.name === 'kind')?.data?.toString() ?? 'image'
  if (!isUploadKind(kindRaw)) {
    throw createError({ statusCode: 400, message: 'Tipo inválido (image, audio ou video).' })
  }

  const relicId = normalizeRelicId(form.find(part => part.name === 'relicId')?.data?.toString())
  if (relicId === null) {
    throw createError({ statusCode: 400, message: 'relicId inválido.' })
  }

  if (filePart.data.length > MAX_SERVER_UPLOAD_BYTES) {
    throw createError({
      statusCode: 413,
      message: 'Ficheiro grande demais para upload direto. Usa /api/admin/upload/sign.',
    })
  }

  const mime = filePart.type ?? ''
  const invalid = validateUpload({ kind: kindRaw, mime, size: filePart.data.length })
  if (invalid) throw createError({ statusCode: 400, message: invalid })

  const extension = extensionForMime(mime)
  if (!extension) throw createError({ statusCode: 400, message: `Tipo não suportado: ${mime}` })

  const key = buildStoragePath(relicId, kindRaw, extension)
  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.storage.from('relic-media').upload(key, filePart.data, {
    contentType: mime,
    upsert: false,
  })

  if (error) {
    throw createError({ statusCode: 502, message: `Falha no armazenamento: ${error.message}` })
  }

  const { data } = supabase.storage.from('relic-media').getPublicUrl(key)
  return { url: data.publicUrl, path: key, kind: kindRaw, size: filePart.data.length, contentType: mime }
})
