import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY || ''

/**
 * Database-level checks for the contract the API relies on: facts/media rows
 * belong to a relic, the cover must be one of its media, renaming keeps the
 * slug, and deleting a relic cascades.
 */
describe.skipIf(!serviceKey || !anonKey)('relic CRUD contract (local database)', () => {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })

  const slug = `contract-test-${randomUUID().slice(0, 8)}`
  let relicId = ''
  let coverId = ''

  beforeAll(async () => {
    const { data, error } = await admin
      .from('relics')
      .insert({
        slug,
        name: 'Contract Test',
        mission: 'Test mission',
        summary: 'Tagline from the form',
        story_text: 'Body from the form',
        published: false,
      })
      .select()
      .single()

    expect(error).toBeNull()
    relicId = data!.id
  })

  afterAll(async () => {
    if (relicId) await admin.from('relics').delete().eq('id', relicId)
  })

  it('stores facts and scenes and accepts a cover from the same relic', async () => {
    const { error: factError } = await admin
      .from('relic_facts')
      .insert({ relic_id: relicId, label: 'Primeiro pouso', value: '20 jul 1969', position: 0 })
      .select()
      .single()
    expect(factError).toBeNull()

    const { data: media, error: mediaError } = await admin
      .from('relic_media')
      .insert([
        { relic_id: relicId, type: 'image', url: '/images/test.jpg', caption: 'Cena', position: 0 },
        { relic_id: relicId, type: 'video', url: '/media/test.mp4', caption: 'Cena 2', position: 1 },
      ])
      .select()
    expect(mediaError).toBeNull()
    coverId = media!.find(item => item.type === 'image')!.id

    const { error: coverError } = await admin
      .from('relics')
      .update({ cover_media_id: coverId })
      .eq('id', relicId)
    expect(coverError).toBeNull()

    const { data: reloaded } = await admin.from('relics').select('*').eq('id', relicId).single()
    expect(reloaded!.cover_media_id).toBe(coverId)
    expect(reloaded!.summary).toBe('Tagline from the form')
    expect(reloaded!.story_text).toBe('Body from the form')
  })

  it('refuses a cover that belongs to another relic', async () => {
    const other = await admin
      .from('relics')
      .insert({ slug: `${slug}-other`, name: 'Other', published: false })
      .select()
      .single()

    const { error } = await admin
      .from('relics')
      .update({ cover_media_id: coverId })
      .eq('id', other.data!.id)

    expect(error).not.toBeNull()
    await admin.from('relics').delete().eq('id', other.data!.id)
  })

  it('keeps children when only the name changes', async () => {
    const { error } = await admin.from('relics').update({ name: 'Renamed' }).eq('id', relicId)
    expect(error).toBeNull()

    const [{ count: facts }, { count: scenes }] = await Promise.all([
      admin.from('relic_facts').select('*', { count: 'exact', head: true }).eq('relic_id', relicId),
      admin.from('relic_media').select('*', { count: 'exact', head: true }).eq('relic_id', relicId),
    ])
    expect(facts).toBe(1)
    expect(scenes).toBe(2)

    const { data } = await admin.from('relics').select('slug').eq('id', relicId).single()
    expect(data!.slug).toBe(slug)
  })

  it('hides drafts from anon and publishes on demand', async () => {
    const { data: draft } = await anon.from('relics').select('id').eq('id', relicId)
    expect(draft).toEqual([])

    await admin.from('relics').update({ published: true }).eq('id', relicId)

    const { data: visible } = await anon.from('relics').select('id').eq('id', relicId)
    expect(visible).toHaveLength(1)
  })

  it('cascades facts and media when the relic is deleted', async () => {
    const { error } = await admin.from('relics').delete().eq('id', relicId)
    expect(error).toBeNull()

    const [{ count: facts }, { count: scenes }] = await Promise.all([
      admin.from('relic_facts').select('*', { count: 'exact', head: true }).eq('relic_id', relicId),
      admin.from('relic_media').select('*', { count: 'exact', head: true }).eq('relic_id', relicId),
    ])
    expect(facts).toBe(0)
    expect(scenes).toBe(0)

    relicId = ''
  })
})
