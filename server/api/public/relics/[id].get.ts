import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { mapDbToRelic } from '../../../utils/relicMapper'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const supabase = serverSupabaseServiceRole<Database>(event)
  const { data: relic, error } = await supabase
    .from('relics')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (error || !relic) {
    throw createError({ statusCode: 404, message: 'Relic not found' })
  }

  const [factsRes, mediaRes] = await Promise.all([
    supabase.from('relic_facts').select('*').eq('relic_id', relic.id).order('position'),
    supabase.from('relic_media').select('*').eq('relic_id', relic.id).order('position'),
  ])

  return mapDbToRelic(relic, factsRes.data || [], mediaRes.data || [])
})
