import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { mapDbToRelic } from '../../../utils/relicMapper'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data: relics, error } = await supabase
    .from('relics')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !relics) {
    throw createError({ statusCode: 500, message: 'Failed to load relics' })
  }

  const results = await Promise.all(
    relics.map(async (relic) => {
      const [factsRes, mediaRes] = await Promise.all([
        supabase.from('relic_facts').select('*').eq('relic_id', relic.id).order('position'),
        supabase.from('relic_media').select('*').eq('relic_id', relic.id).order('position'),
      ])
      return mapDbToRelic(relic, factsRes.data || [], mediaRes.data || [])
    }),
  )

  return results
})
