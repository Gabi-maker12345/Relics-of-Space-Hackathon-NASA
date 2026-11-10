import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || ''

describe('RLS integration (local)', () => {
  it('anon can read published relics', async () => {
    const supabase = createClient(url, anonKey)
    const { data, error } = await supabase.from('relics').select('id,name,published').eq('published', true)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data!.length).toBeGreaterThan(0)
  })

  it('anon cannot insert relics', async () => {
    const supabase = createClient(url, anonKey)
    const { error } = await supabase.from('relics').insert({ slug: 'x-test', name: 'X' })
    expect(error).not.toBeNull()
  })
})
