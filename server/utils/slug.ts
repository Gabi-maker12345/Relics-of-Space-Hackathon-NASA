import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function ensureUniqueSlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let slug = baseSlug || 'relic'
  let counter = 1
  while (true) {
    let query = supabase.from('relics').select('id').eq('slug', slug)
    if (excludeId) query = query.neq('id', excludeId)
    const { data } = await query.limit(1)
    if (!data || data.length === 0) return slug
    slug = `${baseSlug}-${counter++}`
  }
}
