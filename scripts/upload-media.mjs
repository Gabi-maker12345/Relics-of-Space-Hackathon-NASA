#!/usr/bin/env node
/**
 * Sobe o media do seed (`public/images`, `public/media`) para o bucket
 * `relic-media` do Supabase e reescreve no banco os caminhos locais
 * (`/images/...`, `/media/...`) para os URLs públicos do Storage.
 *
 * Uso:
 *   node scripts/upload-media.mjs            # sobe e reescreve
 *   node scripts/upload-media.mjs --dry-run  # só mostra o plano
 *
 * Lê `NUXT_PUBLIC_SUPABASE_URL` e `NUXT_SUPABASE_SECRET_KEY` do `.env` (ou do
 * ambiente). É idempotente: usa `x-upsert` e só troca caminhos que começam por
 * `/`.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { storageAssetPath, storageAssetUrl } from './media-paths.mjs'

const BUCKET = 'relic-media'
const ROOTS = ['public/images', 'public/media']
const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
}

const dryRun = process.argv.includes('--dry-run')

function loadEnv() {
  const env = { ...process.env }
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const index = trimmed.indexOf('=')
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
      if (!env[key]) env[key] = value
    }
  }
  return env
}

const env = loadEnv()
const url = (env.NUXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const key = env.NUXT_SUPABASE_SECRET_KEY || ''
if (!url || !key) {
  console.error('Falta NUXT_PUBLIC_SUPABASE_URL ou NUXT_SUPABASE_SECRET_KEY.')
  process.exit(1)
}

// The public URL must belong to the same project we are uploading to; ignore
// SUPABASE_STORAGE_BASE here (it may point at another environment).
const targetEnv = { ...env, SUPABASE_STORAGE_BASE: '' }

const auth = { apikey: key, Authorization: `Bearer ${key}` }

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function publicUrl(objectPath) {
  return `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`
}

/** '/images/relics/x.jpg' → URL público do ficheiro já enviado. */
const localToPublic = new Map()

async function ensureBucket() {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: '52428800' }),
  })
  if (res.ok) console.log(`bucket ${BUCKET}: criado`)
  else console.log(`bucket ${BUCKET}: já existe (${res.status})`)
}

async function upload(file) {
  const rel = relative('public', file).split('\\').join('/')
  const objectPath = storageAssetPath(rel)
  const localRef = `/${rel}`
  localToPublic.set(localRef, storageAssetUrl(rel, targetEnv))
  const body = readFileSync(file)
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream'
  if (dryRun) return objectPath
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': type, 'x-upsert': 'true' },
    body,
  })
  if (!res.ok) throw new Error(`upload ${objectPath}: ${res.status} ${await res.text()}`)
  return objectPath
}

async function selectAll(table, columns) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${columns}`, { headers: auth })
  if (!res.ok) throw new Error(`select ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function patch(table, query, body) {
  if (dryRun) return
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`patch ${table}?${query}: ${res.status} ${await res.text()}`)
}

/** '/images/relics/x.jpg' → URL público (ou null quando não foi enviado). */
function mapLocal(localPath) {
  if (typeof localPath !== 'string' || !localPath.startsWith('/')) return null
  return localToPublic.get(localPath) ?? null
}

async function main() {
  console.log(`Supabase: ${url}${dryRun ? ' (dry-run)' : ''}`)
  await ensureBucket()

  const files = ROOTS.filter(existsSync).flatMap(walk)
  const uploaded = new Set()
  const skipped = []
  for (const file of files) {
    try {
      uploaded.add(await upload(file))
    }
    catch (error) {
      // tipos fora da allowlist do bucket (ex.: gif) não são usados pelo site
      skipped.push(`${file}: ${String(error.message).slice(0, 90)}`)
    }
  }
  console.log(`ficheiros: ${uploaded.size} enviados, ${skipped.length} ignorados`)
  for (const line of skipped) console.log(`  ignorado ${line}`)

  let changed = 0
  const rewriteRow = async (table, row, columns, idColumn = 'id') => {
    const patchBody = {}
    for (const column of columns) {
      const mapped = mapLocal(row[column])
      if (mapped && mapped !== row[column]) patchBody[column] = mapped
    }
    if (Object.keys(patchBody).length === 0) return
    changed += 1
    await patch(table, `${idColumn}=eq.${row[idColumn]}`, patchBody)
  }

  for (const row of await selectAll('relic_media', 'id,url,poster_url,audio_url')) {
    await rewriteRow('relic_media', row, ['url', 'poster_url', 'audio_url'])
  }
  for (const row of await selectAll('relics', 'id,intro_audio_url')) {
    await rewriteRow('relics', row, ['intro_audio_url'])
  }
  for (const row of await selectAll('relic_translations', 'relic_id,lang,intro_audio_url')) {
    const patchBody = {}
    const mapped = mapLocal(row.intro_audio_url)
    if (mapped && mapped !== row.intro_audio_url) patchBody.intro_audio_url = mapped
    if (Object.keys(patchBody).length === 0) continue
    changed += 1
    await patch('relic_translations', `relic_id=eq.${row.relic_id}&lang=eq.${row.lang}`, patchBody)
  }
  for (const row of await selectAll('media_translations', 'media_id,lang,audio_url')) {
    const patchBody = {}
    const mapped = mapLocal(row.audio_url)
    if (mapped && mapped !== row.audio_url) patchBody.audio_url = mapped
    if (Object.keys(patchBody).length === 0) continue
    changed += 1
    await patch('media_translations', `media_id=eq.${row.media_id}&lang=eq.${row.lang}`, patchBody)
  }

  console.log(`linhas atualizadas: ${changed}`)

  if (!dryRun) {
    const sample = [...uploaded][0]
    if (sample) {
      const head = await fetch(publicUrl(sample), { method: 'HEAD' })
      console.log(`verificação ${sample}: ${head.status}`)
    }
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
