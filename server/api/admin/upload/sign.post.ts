import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/auth'
import {
  buildStoragePath,
  extensionForMime,
  isUploadKind,
  normalizeRelicId,
  validateUpload,
} from '../../../utils/upload'

/**
 * Issues a signed upload URL so the browser can send the file straight to
 * Storage. This is the only path that works on Vercel, where function request
 * bodies are capped at 4.5 MB.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event).catch(() => ({}))
  const kindRaw = body?.kind ?? 'image'
  if (!isUploadKind(kindRaw)) {
    throw createError({ statusCode: 400, message: 'Tipo inválido (image, audio ou video).' })
  }

  const relicId = normalizeRelicId(body?.relicId)
  if (relicId === null) {
    throw createError({ statusCode: 400, message: 'relicId inválido.' })
  }

  const mime = typeof body?.mime === 'string' ? body.mime : ''
  const size = Number(body?.size)
  if (!Number.isFinite(size)) {
    throw createError({ statusCode: 400, message: 'Tamanho inválido.' })
  }

  const invalid = validateUpload({ kind: kindRaw, mime, size })
  if (invalid) throw createError({ statusCode: 400, message: invalid })

  const extension = extensionForMime(mime)
  if (!extension) throw createError({ statusCode: 400, message: `Tipo não suportado: ${mime}` })

  const path = buildStoragePath(relicId, kindRaw, extension)
  const supabase = serverSupabaseServiceRole(event)
  const { data, error } = await supabase.storage.from('relic-media').createSignedUploadUrl(path)

  if (error || !data) {
    throw createError({
      statusCode: 502,
      message: `Falha ao assinar upload: ${error?.message ?? 'sem resposta'}`,
    })
  }

  const { data: publicUrl } = supabase.storage.from('relic-media').getPublicUrl(path)

  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicUrl.publicUrl,
    kind: kindRaw,
    contentType: mime,
    size,
  }
})
