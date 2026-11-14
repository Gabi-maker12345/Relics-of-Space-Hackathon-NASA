/**
 * Shared path conventions for the `relic-media` bucket.
 *
 * Seed media lives in `public/` during development, but the database stores
 * absolute Storage URLs so a deployed app never depends on the local `public/`
 * folder. The object key is always `assets/<slugified path relative to public>`.
 */
export const STORAGE_BUCKET = 'relic-media'
export const STORAGE_ASSETS_PREFIX = 'assets'

/** The Storage API only accepts ASCII-safe keys; mirror upload-media.mjs. */
export function slugifyStoragePath(path) {
  return path
    .split(/[\\/]/)
    .map(segment => segment
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('/')
}

/** `images/relics/x.jpg` → `assets/images/relics/x.jpg`. */
export function storageObjectPath(relativePublicPath) {
  return `${STORAGE_ASSETS_PREFIX}/${slugifyStoragePath(relativePublicPath)}`
}

/**
 * Public base for seed assets. `SUPABASE_STORAGE_BASE` wins; otherwise derive
 * it from the Supabase project URL. The returned value never ends with `/`.
 */
export function storageBase(env = process.env) {
  const explicit = env.SUPABASE_STORAGE_BASE?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const projectUrl = env.NUXT_PUBLIC_SUPABASE_URL?.trim()
  if (!projectUrl) return ''
  return `${projectUrl.replace(/\/+$/, '')}/storage/v1/object/public/${STORAGE_BUCKET}/${STORAGE_ASSETS_PREFIX}`
}

/** `images/relics/x.jpg` → public Storage URL. */
export function storageAssetUrl(relativePublicPath, env = process.env) {
  const base = storageBase(env)
  if (!base) {
    throw new Error('SUPABASE_STORAGE_BASE (or NUXT_PUBLIC_SUPABASE_URL) is required to build Storage URLs.')
  }
  return `${base}/${slugifyStoragePath(relativePublicPath)}`
}

/**
 * Converts a seed value to an absolute Storage URL.
 * - `null`/empty → `null`
 * - already http(s) → unchanged
 * - starts with `/` → mapped to the bucket
 */
export function toStorageUrl(value, env = process.env) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (raw === '') return null
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return storageAssetUrl(raw.slice(1), env)
  throw new Error(`Unsupported asset URL (must be absolute or start with /): ${raw}`)
}
