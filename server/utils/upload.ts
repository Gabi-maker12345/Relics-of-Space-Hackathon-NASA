import { randomUUID } from 'node:crypto'

/**
 * Shared rules for media uploads.
 *
 * The bucket (`relic-media`, see the core migration) is the source of truth for
 * what Supabase will accept. These lists must stay in sync with it, otherwise an
 * upload passes our validation and fails inside Storage with a cryptic error.
 */

export type UploadKind = 'image' | 'audio' | 'video'

export const UPLOAD_KINDS: readonly UploadKind[] = ['image', 'audio', 'video']

/** Vercel caps serverless function request bodies at 4.5 MB. */
export const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024

/** Per-kind limits, all below the bucket's 50 MB cap. */
export const UPLOAD_LIMITS: Record<UploadKind, number> = {
  image: 5 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 50 * 1024 * 1024,
}

/** Mirrors `allowed_mime_types` in the bucket migration. */
export const UPLOAD_MIME_TYPES: Record<UploadKind, readonly string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg'],
  video: ['video/mp4', 'video/webm'],
}

/** Extension derived from the MIME type, never from the client filename. */
export const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/webm': '.weba',
  'audio/ogg': '.ogg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === 'string' && (UPLOAD_KINDS as readonly string[]).includes(value)
}

export function extensionForMime(mime: string): string | null {
  return MIME_EXTENSIONS[mime] ?? null
}

/**
 * Accepts a relic UUID or the literal `common` for shared assets.
 * Returns `null` when the value could escape the folder or is malformed.
 */
export function normalizeRelicId(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return 'common'
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (value === 'common') return 'common'
  if (!isUuid(value)) return null
  return value.toLowerCase()
}

const FOLDER_BY_KIND: Record<UploadKind, string> = {
  image: 'images',
  audio: 'audio',
  video: 'videos',
}

export function buildStoragePath(relicId: string, kind: UploadKind, extension: string): string {
  return `relics/${relicId}/${FOLDER_BY_KIND[kind]}/${randomUUID()}${extension}`
}

/** Storage deletion must stay inside the `relics/` prefix and never traverse up. */
export function isSafeStoragePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0 || path.length > 512) return false
  if (!path.startsWith('relics/')) return false
  if (path.includes('..') || path.includes('\\') || path.includes('//')) return false
  return true
}

/**
 * Validates kind, MIME and size. Returns an error message, or `null` when valid.
 */
export function validateUpload(input: {
  kind: UploadKind
  mime: string
  size: number
}): string | null {
  const { kind, mime, size } = input
  if (!(UPLOAD_MIME_TYPES[kind] as readonly string[]).includes(mime)) {
    return `Tipo não permitido para ${kind}: ${mime || 'desconhecido'}.`
  }
  if (!extensionForMime(mime)) {
    return `Sem extensão conhecida para ${mime}.`
  }
  if (!Number.isFinite(size) || size <= 0) {
    return 'Ficheiro vazio.'
  }
  if (size > UPLOAD_LIMITS[kind]) {
    const mb = Math.round(UPLOAD_LIMITS[kind] / (1024 * 1024))
    return `Ficheiro demasiado grande (máximo ${mb} MB para ${kind}).`
  }
  return null
}
