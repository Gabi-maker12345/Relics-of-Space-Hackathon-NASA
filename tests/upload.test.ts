import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  MAX_SERVER_UPLOAD_BYTES,
  UPLOAD_LIMITS,
  UPLOAD_MIME_TYPES,
  buildStoragePath,
  extensionForMime,
  isSafeStoragePath,
  isUploadKind,
  isUuid,
  normalizeRelicId,
  validateUpload,
} from '../server/utils/upload'

const RELIC_ID = '00000000-0000-4000-8000-000000000001'

describe('upload rules', () => {
  it('recognises only the supported kinds', () => {
    expect(isUploadKind('image')).toBe(true)
    expect(isUploadKind('audio')).toBe(true)
    expect(isUploadKind('video')).toBe(true)
    expect(isUploadKind('document')).toBe(false)
    expect(isUploadKind(undefined)).toBe(false)
  })

  it('derives the extension from the MIME type, never the filename', () => {
    expect(extensionForMime('image/png')).toBe('.png')
    expect(extensionForMime('video/webm')).toBe('.webm')
    expect(extensionForMime('application/pdf')).toBeNull()
  })

  it('maps every allowed MIME type to an extension', () => {
    for (const mimes of Object.values(UPLOAD_MIME_TYPES)) {
      for (const mime of mimes) {
        expect(extensionForMime(mime)).not.toBeNull()
      }
    }
  })

  it('keeps server uploads under the Vercel body limit', () => {
    expect(MAX_SERVER_UPLOAD_BYTES).toBeLessThan(4.5 * 1024 * 1024)
  })

  it('keeps per-kind limits inside the bucket 50 MB cap', () => {
    for (const limit of Object.values(UPLOAD_LIMITS)) {
      expect(limit).toBeLessThanOrEqual(50 * 1024 * 1024)
    }
  })
})

describe('isUuid', () => {
  it('accepts canonical UUIDs only', () => {
    expect(isUuid(RELIC_ID)).toBe(true)
    expect(isUuid('common')).toBe(false)
    expect(isUuid(`${RELIC_ID}/x`)).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})

describe('normalizeRelicId', () => {
  it('defaults to the shared folder when missing', () => {
    expect(normalizeRelicId(undefined)).toBe('common')
    expect(normalizeRelicId('')).toBe('common')
    expect(normalizeRelicId('common')).toBe('common')
  })

  it('accepts and lowercases a UUID', () => {
    expect(normalizeRelicId(RELIC_ID.toUpperCase())).toBe(RELIC_ID)
  })

  it('accepts a slug so new relics can upload before they have an id', () => {
    expect(normalizeRelicId('apollo-lunar-module')).toBe('apollo-lunar-module')
    expect(normalizeRelicId('Apollo-Lunar')).toBe('apollo-lunar')
  })

  it('rejects anything that could escape the folder', () => {
    expect(normalizeRelicId('../etc')).toBeNull()
    expect(normalizeRelicId('relics/x')).toBeNull()
    expect(normalizeRelicId('a/b')).toBeNull()
    expect(normalizeRelicId(42)).toBeNull()
  })
})

describe('buildStoragePath', () => {
  it('organises files by relic and kind', () => {
    const path = buildStoragePath(RELIC_ID, 'image', '.png')
    expect(path).toMatch(new RegExp(`^relics/${RELIC_ID}/images/[0-9a-f-]{36}\\.png$`))
  })

  it('uses distinct names for repeated uploads', () => {
    const first = buildStoragePath(RELIC_ID, 'video', '.mp4')
    const second = buildStoragePath(RELIC_ID, 'video', '.mp4')
    expect(first).not.toBe(second)
  })
})

describe('isSafeStoragePath', () => {
  it('accepts paths inside relics/', () => {
    expect(isSafeStoragePath(`relics/${RELIC_ID}/images/a.png`)).toBe(true)
  })

  it('rejects traversal, absolute and foreign paths', () => {
    expect(isSafeStoragePath('relics/../secrets.png')).toBe(false)
    expect(isSafeStoragePath('relics//a.png')).toBe(false)
    expect(isSafeStoragePath('relics\\a.png')).toBe(false)
    expect(isSafeStoragePath('/etc/passwd')).toBe(false)
    expect(isSafeStoragePath('avatars/a.png')).toBe(false)
    expect(isSafeStoragePath('')).toBe(false)
    expect(isSafeStoragePath(null)).toBe(false)
  })
})

describe('validateUpload', () => {
  it('accepts a small PNG', () => {
    expect(validateUpload({ kind: 'image', mime: 'image/png', size: 1024 })).toBeNull()
  })

  it('rejects MIME types the bucket would refuse', () => {
    expect(validateUpload({ kind: 'audio', mime: 'audio/wav', size: 1024 })).toMatch(/não permitido/)
    expect(validateUpload({ kind: 'video', mime: 'video/quicktime', size: 1024 })).toMatch(/não permitido/)
    expect(validateUpload({ kind: 'image', mime: 'image/gif', size: 1024 })).toMatch(/não permitido/)
  })

  it('rejects files over the per-kind limit', () => {
    const tooBig = UPLOAD_LIMITS.audio + 1
    expect(validateUpload({ kind: 'audio', mime: 'audio/mpeg', size: tooBig })).toMatch(/demasiado grande/)
  })

  it('rejects empty files', () => {
    expect(validateUpload({ kind: 'image', mime: 'image/png', size: 0 })).toMatch(/vazio/)
  })
})

describe('bucket migration', () => {
  it('allows exactly the MIME types the upload rules accept', () => {
    const migrationsDir = fileURLToPath(new URL('../supabase/migrations', import.meta.url))
    const sql = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => readFileSync(`${migrationsDir}/${file}`, 'utf8'))
      .join('\n')

    const bucket = sql.match(/insert into storage\.buckets[\s\S]*?relic-media[\s\S]*?array\[([\s\S]*?)\]/i)
    expect(bucket).not.toBeNull()

    const bucketMimes = [...bucket![1].matchAll(/'([^']+)'/g)].map(match => match[1]).sort()
    const ruleMimes = Object.values(UPLOAD_MIME_TYPES).flat().sort()

    expect(bucketMimes).toEqual(ruleMimes)
  })
})
