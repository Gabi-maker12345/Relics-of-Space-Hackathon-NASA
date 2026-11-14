#!/usr/bin/env node
/**
 * Generates `supabase/seed.sql` from `data/relics.json`.
 *
 * The JSON file is the single source of truth: the SQL seed and the SSR
 * fallback in `app/data/relics.ts` both read it, so the public pages and the
 * database cannot drift apart.
 *
 * Usage:
 *   node scripts/generate-seed.mjs            # write supabase/seed.sql
 *   node scripts/generate-seed.mjs --check    # fail if the file is stale
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const datasetPath = join(root, 'data', 'relics.json')
const outputPath = join(root, 'supabase', 'seed.sql')
const imagesDir = join(root, 'public', 'images', 'relics')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATUSES = new Set(['active', 'silent', 'lost'])
const LOCATIONS = new Set(['moon', 'mars', 'deep_space'])

function fail(message) {
  console.error(`seed: ${message}`)
  process.exit(1)
}

function sql(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlNumber(value) {
  if (!Number.isInteger(value)) fail(`expected an integer, got ${value}`)
  return String(value)
}

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'))
if (!Array.isArray(dataset.relics) || dataset.relics.length === 0) {
  fail('data/relics.json must contain a non-empty "relics" array')
}

const seenRelicIds = new Set()
const seenSlugs = new Set()
const seenMediaIds = new Set()

for (const relic of dataset.relics) {
  if (!UUID.test(relic.id)) fail(`invalid relic id: ${relic.id}`)
  if (seenRelicIds.has(relic.id)) fail(`duplicate relic id: ${relic.id}`)
  seenRelicIds.add(relic.id)

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(relic.slug)) fail(`invalid slug: ${relic.slug}`)
  if (seenSlugs.has(relic.slug)) fail(`duplicate slug: ${relic.slug}`)
  seenSlugs.add(relic.slug)

  for (const field of ['name', 'mission', 'summary', 'story_text', 'alt', 'reference_url']) {
    if (typeof relic[field] !== 'string' || relic[field].trim() === '') {
      fail(`${relic.slug}: missing ${field}`)
    }
  }
  if (!/^https?:\/\//i.test(relic.reference_url)) {
    fail(`${relic.slug}: reference_url must be an http(s) URL`)
  }
  if (typeof relic.is_extra !== 'boolean') {
    fail(`${relic.slug}: is_extra must be a boolean`)
  }
  if (!STATUSES.has(relic.status)) fail(`${relic.slug}: invalid status ${relic.status}`)
  if (!LOCATIONS.has(relic.location)) fail(`${relic.slug}: invalid location ${relic.location}`)
  if (!Array.isArray(relic.facts) || relic.facts.length === 0) {
    fail(`${relic.slug}: at least one fact is required`)
  }
  if (!Array.isArray(relic.media) || relic.media.length === 0) {
    fail(`${relic.slug}: at least one media item is required`)
  }

  relic.media.forEach((media, index) => {
    if (!UUID.test(media.id)) fail(`${relic.slug}: invalid media id ${media.id}`)
    if (seenMediaIds.has(media.id)) fail(`duplicate media id: ${media.id}`)
    seenMediaIds.add(media.id)

    if (media.type !== 'image' && media.type !== 'video') {
      fail(`${relic.slug}: invalid media type ${media.type}`)
    }
    if (index === 0 && media.type !== 'image') {
      fail(`${relic.slug}: the cover (first media) must be an image`)
    }
    for (const field of ['file', 'kicker', 'title', 'caption', 'credit', 'source_url']) {
      if (typeof media[field] !== 'string' || media[field].trim() === '') {
        fail(`${relic.slug}: media ${index + 1} is missing ${field}`)
      }
    }
    if (!existsSync(join(imagesDir, media.file))) {
      fail(`${relic.slug}: image not found: public/images/relics/${media.file}`)
    }
  })
}

const lines = []
const push = (...values) => lines.push(...values)
const slugList = dataset.relics.map(relic => sql(relic.slug)).join(',\n  ')

push(
  '-- ---------------------------------------------------------------------------',
  '-- Space Relics — demo seed (generated, idempotent)',
  '--',
  '-- Source of truth: data/relics.json',
  '-- Regenerate with: npm run seed:generate',
  '--',
  '-- Safe to run repeatedly: the demo rows are deleted by slug and reinserted.',
  '-- Admin edits to these relics are overwritten.',
  '-- ---------------------------------------------------------------------------',
  '',
  'begin;',
  '',
  '-- Remove the demo rows (cascades to facts, media and translations).',
  'delete from public.relics',
  'where slug in (',
  `  ${slugList}`,
  ');',
  '',
  'insert into public.relics',
  '  (id, slug, name, mission, summary, story_text, status, location, published, alt, ratio, reference_url, is_extra)',
  'values',
)

const relicRows = dataset.relics.map(relic => [
  '  (',
  [
    sql(relic.id),
    sql(relic.slug),
    sql(relic.name),
    sql(relic.mission),
    sql(relic.summary),
    sql(relic.story_text),
    sql(relic.status),
    sql(relic.location),
    relic.published ? 'true' : 'false',
    sql(relic.alt),
    sql(relic.ratio || '16 / 9'),
    sql(relic.reference_url),
    relic.is_extra ? 'true' : 'false',
  ].join(', '),
  ')',
].join(''))
push(relicRows.join(',\n') + ';', '')

const factRows = []
for (const relic of dataset.relics) {
  relic.facts.forEach((fact, position) => {
    factRows.push(`  (${[
      sql(relic.id),
      sql(fact.label),
      sql(fact.value),
      sqlNumber(position),
    ].join(', ')})`)
  })
}
if (factRows.length > 0) {
  push(
    'insert into public.relic_facts (relic_id, label, value, position)',
    'values',
    factRows.join(',\n') + ';',
    '',
  )
}

const mediaRows = []
for (const relic of dataset.relics) {
  relic.media.forEach((media, position) => {
    mediaRows.push(`  (${[
      sql(media.id),
      sql(relic.id),
      sql(media.type),
      sql(`/images/relics/${media.file}`),
      sql(media.poster_url ?? null),
      sql(media.kicker),
      sql(media.title),
      sql(media.caption),
      sql(media.credit),
      sql(media.source_url ?? null),
      sqlNumber(position),
    ].join(', ')})`)
  })
}
push(
  'insert into public.relic_media',
  '  (id, relic_id, type, url, poster_url, kicker, title, caption, credit, source_url, position)',
  'values',
  mediaRows.join(',\n') + ';',
  '',
)

push('-- The first media item of each relic is its cover.')
for (const relic of dataset.relics) {
  push(`update public.relics set cover_media_id = ${sql(relic.media[0].id)} where id = ${sql(relic.id)};`)
}
push('', 'commit;', '')

const output = lines.join('\n')
const check = process.argv.includes('--check')

if (check) {
  const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : ''
  if (current !== output) {
    console.error('seed: supabase/seed.sql is stale. Run `npm run seed:generate`.')
    process.exit(1)
  }
  console.log('seed: supabase/seed.sql is up to date.')
}
else {
  writeFileSync(outputPath, output)
  const mediaCount = dataset.relics.reduce((total, relic) => total + relic.media.length, 0)
  const factCount = dataset.relics.reduce((total, relic) => total + relic.facts.length, 0)
  console.log(
    `seed: wrote ${dataset.relics.length} relics, ${factCount} facts and ${mediaCount} media rows to supabase/seed.sql`,
  )
}
