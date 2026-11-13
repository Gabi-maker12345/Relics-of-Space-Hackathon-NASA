import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migrationsDir = fileURLToPath(new URL('../supabase/migrations', import.meta.url))
const seedPath = fileURLToPath(new URL('../supabase/seed.sql', import.meta.url))

const migrationFiles = readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort()

const migrationSql = migrationFiles
  .map(file => readFileSync(`${migrationsDir}/${file}`, 'utf8'))
  .join('\n')

const seedSql = readFileSync(seedPath, 'utf8')

function tablesWithRls(): string[] {
  const tables = [...migrationSql.matchAll(/create table public\.(\w+)/gi)].map(match => match[1])
  return tables.filter((table) => {
    const pattern = new RegExp(
      `alter table public\\.${table}\\s+enable row level security`,
      'i',
    )
    return pattern.test(migrationSql)
  })
}

describe('database migrations', () => {
  it('uses unique, ordered migration filenames', () => {
    expect(migrationFiles.length).toBeGreaterThan(0)
    expect(new Set(migrationFiles).size).toBe(migrationFiles.length)
    const sorted = [...migrationFiles].sort()
    expect(migrationFiles).toEqual(sorted)
  })

  it('enables RLS on every public table', () => {
    const tables = [...migrationSql.matchAll(/create table public\.(\w+)/gi)].map(match => match[1])
    expect(tables.length).toBeGreaterThan(0)
    expect(tablesWithRls()).toEqual(expect.arrayContaining(tables))
    expect(tablesWithRls()).toHaveLength(tables.length)
  })

  it('cascades deletes from relics to every child table', () => {
    const childForeignKeys = [
      ...migrationSql.matchAll(
        /references public\.relics\s*\(id\)([^,;]*)/gi,
      ),
    ]
    expect(childForeignKeys.length).toBeGreaterThanOrEqual(4)
    for (const match of childForeignKeys) {
      expect(match[1]).toMatch(/on delete cascade/i)
    }
  })

  it('lets a deleted cover media null the reference instead of deleting the relic', () => {
    expect(migrationSql).toMatch(
      /references public\.relic_media\s*\(id\)\s+on delete set null/i,
    )
  })

  it('keeps relic slugs unique and URL-safe', () => {
    expect(migrationSql).toMatch(/slug text not null unique/i)
    expect(migrationSql).toMatch(/slug ~ '\^\[a-z0-9\]\+/)
  })

  it('defines the admin check as a security-definer function', () => {
    expect(migrationSql).toMatch(
      /create or replace function public\.is_admin\(\)[\s\S]*?security definer/i,
    )
  })

  it('creates the public media bucket with size and MIME limits', () => {
    expect(migrationSql).toMatch(/insert into storage\.buckets/i)
    expect(migrationSql).toMatch(/'relic-media'/)
    expect(migrationSql).toMatch(/52428800/)
    expect(migrationSql).toMatch(/allowed_mime_types/i)
  })
})

describe('demo seed', () => {
  it('is idempotent for relics', () => {
    expect(seedSql).toMatch(/delete from public\.relics\s+where slug in/i)
    expect(seedSql).toMatch(/insert into public\.relics/i)
  })

  it('seeds the relics planned for the demo', () => {
    for (const slug of [
      'spirit',
      'opportunity',
      'sojourner',
      'ingenuity',
      'apollo-lunar-roving-vehicle',
      'lunokhod-1',
      'voyager-1',
      'voyager-2',
      'pioneer-10',
      'pioneer-11',
    ]) {
      expect(seedSql).toContain(`'${slug}'`)
    }
  })

  it('replaces facts and media by cascading from the relic rows', () => {
    expect(seedSql).toMatch(/delete from public\.relics/i)
    expect(migrationSql).toMatch(/references public\.relics\s*\(id\)[^,;]*on delete cascade/i)
  })
})
