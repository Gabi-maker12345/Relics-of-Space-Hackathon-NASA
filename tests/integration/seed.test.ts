import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../app/types/database.types'
import dataset from '../../data/relics.json'

try {
  loadEnvFile()
}
catch {
  // ignore
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY || ''

describe.skipIf(!serviceKey || !anonKey)('demo seed (BE-14 integration)', () => {
  const admin = createClient<Database>(url, serviceKey || 'placeholder', { auth: { persistSession: false } })
  const anon = createClient<Database>(url, anonKey || 'placeholder', { auth: { persistSession: false } })
  const slugs = dataset.relics.map(relic => relic.slug)

  it('applies exactly once, even after a second seed run', async () => {
    const { data, error } = await admin
      .from('relics')
      .select('id, slug, published, cover_media_id, intro_audio_url')
      .in('slug', slugs)

    expect(error).toBeNull()
    expect(data).toHaveLength(slugs.length)

    const bySlug = new Map((data ?? []).map(row => [row.slug, row]))
    for (const relic of dataset.relics) {
      const row = bySlug.get(relic.slug)
      expect(row, relic.slug).toBeDefined()
      expect(row!.id).toBe(relic.id)
      expect(row!.published).toBe(true)
      expect(row!.cover_media_id).toBe(relic.media[0].id)
      expect(row!.intro_audio_url).toBe(relic.intro_audio_url)
    }
  })

  it('keeps one fact sheet and one media list per relic', async () => {
    const relicIds = dataset.relics.map(relic => relic.id)

    const [factsRes, mediaRes] = await Promise.all([
      admin.from('relic_facts').select('relic_id, label, value, position').in('relic_id', relicIds),
      admin.from('relic_media').select('relic_id, id, position, credit, source_url, audio_url').in('relic_id', relicIds),
    ])

    expect(factsRes.error).toBeNull()
    expect(mediaRes.error).toBeNull()
    expect(factsRes.data).toHaveLength(dataset.relics.reduce((total, relic) => total + relic.facts.length, 0))
    expect(mediaRes.data).toHaveLength(dataset.relics.reduce((total, relic) => total + relic.media.length, 0))

    for (const relic of dataset.relics) {
      const facts = (factsRes.data ?? []).filter(row => row.relic_id === relic.id)
      const media = (mediaRes.data ?? []).filter(row => row.relic_id === relic.id)

      expect(facts, relic.slug).toHaveLength(relic.facts.length)
      expect(media, relic.slug).toHaveLength(relic.media.length)
      expect(new Set(facts.map(row => row.position)).size, relic.slug).toBe(facts.length)
      expect(new Set(media.map(row => row.position)).size, relic.slug).toBe(media.length)

      for (const item of media) {
        expect(item.credit, `${relic.slug}/${item.id}`).not.toBe('')
        expect(item.source_url, `${relic.slug}/${item.id}`).toMatch(/^https:\/\/images\.nasa\.gov\/details\//)
        const source = relic.media.find(entry => entry.id === item.id)
        expect(source, `${relic.slug}/${item.id}`).toBeDefined()
        expect(item.audio_url, `${relic.slug}/${item.id}`).toBe(source!.audio_url)
      }
    }
  })

  it('publishes every seeded relic to anonymous readers', async () => {
    const { data, error } = await anon
      .from('relics')
      .select('slug')
      .in('slug', slugs)
      .order('slug')

    expect(error).toBeNull()
    expect(data).toHaveLength(slugs.length)
  })
})
