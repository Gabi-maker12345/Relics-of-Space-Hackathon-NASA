import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { RelicScene, SceneKind } from '#shared/types/relic'

type RelicRow = Database['public']['Tables']['relics']['Row']
type MediaRow = Database['public']['Tables']['relic_media']['Row']
type MediaInsert = Database['public']['Tables']['relic_media']['Insert']
type MediaUpdate = Database['public']['Tables']['relic_media']['Update']

/** Absolute http(s) URLs or site-relative paths (`/images/...`). */
const assetUrl = z.string()
  .trim()
  .min(1, 'A mídia precisa de um URL.')
  .max(2048)
  .refine(
    value => value.startsWith('/') || /^https?:\/\//i.test(value),
    'Use um URL http(s) ou um caminho começado por /.',
  )

/** Same rule but allows an empty string, which clears the optional field. */
const optionalAssetUrl = z.string()
  .trim()
  .max(2048)
  .refine(
    value => value === '' || value.startsWith('/') || /^https?:\/\//i.test(value),
    'Use um URL http(s) ou um caminho começado por /.',
  )
  .optional()
  .nullable()

const positionSchema = z.number().int().min(0).max(10_000)

export const mediaInputSchema = z.object({
  kind: z.enum(['image', 'video']),
  src: assetUrl,
  poster: optionalAssetUrl,
  kicker: z.string().trim().max(200).optional(),
  title: z.string().trim().max(300).optional(),
  body: z.string().max(4000).optional(),
  credit: z.string().trim().max(300).optional(),
  source_url: optionalAssetUrl,
  audio_url: optionalAssetUrl,
  mute_video: z.boolean().optional(),
  is_cover: z.boolean().optional(),
  position: positionSchema.optional(),
})

export const mediaPatchSchema = mediaInputSchema.partial()

export const mediaOrderSchema = z.object({
  ids: z.array(z.string().uuid('Identificador de mídia inválido.')).min(1, 'A ordem precisa de pelo menos uma mídia.'),
})

export const mediaCoverSchema = z.object({
  media_id: z.string().uuid('Identificador de mídia inválido.').nullable(),
})

export type ParsedMediaInput = z.infer<typeof mediaInputSchema>
export type ParsedMediaPatch = z.infer<typeof mediaPatchSchema>

function nullableUrl(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  return value === '' ? null : value
}

function toMediaRowFields(input: ParsedMediaInput | ParsedMediaPatch): MediaUpdate {
  const patch: MediaUpdate = {}
  if (input.kind !== undefined) patch.type = input.kind
  if (input.src !== undefined) patch.url = input.src
  if (input.poster !== undefined) patch.poster_url = nullableUrl(input.poster)
  if (input.kicker !== undefined) patch.kicker = input.kicker
  if (input.title !== undefined) patch.title = input.title
  if (input.body !== undefined) patch.caption = input.body
  if (input.credit !== undefined) patch.credit = input.credit
  if (input.source_url !== undefined) patch.source_url = nullableUrl(input.source_url)
  if (input.audio_url !== undefined) patch.audio_url = nullableUrl(input.audio_url)
  if (input.mute_video !== undefined) patch.mute_video = input.mute_video
  return patch
}

export function toMediaInsert(
  relicId: string,
  input: ParsedMediaInput,
  position: number,
): MediaInsert {
  return {
    relic_id: relicId,
    type: input.kind,
    url: input.src,
    poster_url: nullableUrl(input.poster),
    kicker: input.kicker ?? '',
    title: input.title ?? '',
    caption: input.body ?? '',
    credit: input.credit ?? '',
    source_url: nullableUrl(input.source_url),
    audio_url: nullableUrl(input.audio_url),
    mute_video: input.mute_video ?? input.kind === 'video',
    position,
  }
}

export function toMediaPatch(input: ParsedMediaPatch): MediaUpdate {
  return toMediaRowFields(input)
}

/** Loads one media row; `null` when it does not exist. */
export async function findMedia(
  client: SupabaseClient<Database>,
  mediaId: string,
): Promise<MediaRow | null> {
  const { data } = await client.from('relic_media').select('*').eq('id', mediaId).maybeSingle()
  return data
}

async function mediaOfRelic(client: SupabaseClient<Database>, relicId: string): Promise<MediaRow[]> {
  const { data } = await client
    .from('relic_media')
    .select('*')
    .eq('relic_id', relicId)
    .order('position')
  return data ?? []
}

async function setCoverId(
  client: SupabaseClient<Database>,
  relicId: string,
  mediaId: string | null,
): Promise<string | null> {
  const { error } = await client
    .from('relics')
    .update({ cover_media_id: mediaId })
    .eq('id', relicId)
  return error?.message ?? null
}

export interface MediaMutationResult {
  error?: string
  /** Set when the caller asked this item to become the cover. */
  coverMediaId?: string | null
}

/**
 * Appends a media item (or inserts it at `position`, shifting the rest).
 *
 * There is no multi-statement transaction in supabase-js, so failures are
 * compensated: shifted rows are restored when the insert fails.
 */
export async function addMedia(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  input: ParsedMediaInput,
): Promise<MediaMutationResult> {
  const existing = await mediaOfRelic(client, relic.id)
  const lastPosition = existing.reduce((max, item) => Math.max(max, item.position), -1)
  // Inserting beyond the end would leave pointless gaps; clamp to append.
  const position = Math.min(Math.max(input.position ?? lastPosition + 1, 0), lastPosition + 1)

  const shifted = position <= lastPosition
    ? existing.filter(item => item.position >= position)
    : []

  for (const item of shifted) {
    const { error } = await client
      .from('relic_media')
      .update({ position: item.position + 1 })
      .eq('id', item.id)
    if (error) return { error: error.message }
  }

  const { data, error } = await client
    .from('relic_media')
    .insert(toMediaInsert(relic.id, input, position))
    .select()
    .single()

  if (error || !data) {
    // Restore the previous positions, otherwise the list keeps gaps.
    await restorePositions(client, new Map(shifted.map(item => [item.id, item.position])))
    return { error: error?.message ?? 'Falha ao adicionar a mídia.' }
  }

  if (!input.is_cover) return {}
  const coverError = await setCoverId(client, relic.id, data.id)
  if (coverError) {
    await client.from('relic_media').delete().eq('id', data.id)
    await restorePositions(client, new Map(shifted.map(item => [item.id, item.position])))
    return { error: coverError }
  }
  return { coverMediaId: data.id }
}

/** Updates one media item, keeping the cover pointer consistent. */
export async function updateMedia(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  media: MediaRow,
  input: ParsedMediaPatch,
): Promise<MediaMutationResult> {
  const patch = toMediaPatch(input)
  if (Object.keys(patch).length > 0) {
    const { error } = await client.from('relic_media').update(patch).eq('id', media.id)
    if (error) return { error: error.message }
  }

  if (input.is_cover === true) {
    const coverError = await setCoverId(client, relic.id, media.id)
    if (coverError) return { error: coverError }
    return { coverMediaId: media.id }
  }

  // Unsetting the cover is only valid when this item currently owns it.
  if (input.is_cover === false && relic.cover_media_id === media.id) {
    const coverError = await setCoverId(client, relic.id, null)
    if (coverError) return { error: coverError }
    return { coverMediaId: null }
  }

  return {}
}

/** Deletes a media item. `on delete set null` clears the cover automatically. */
export async function deleteMedia(
  client: SupabaseClient<Database>,
  media: MediaRow,
): Promise<MediaMutationResult> {
  const { error } = await client.from('relic_media').delete().eq('id', media.id)
  return error ? { error: error.message } : {}
}

/**
 * Rewrites positions from the caller's full ordered id list. The list must
 * match the relic exactly: a stale admin tab cannot drop rows by omission.
 */
export async function reorderMedia(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  ids: string[],
): Promise<MediaMutationResult> {
  const existing = await mediaOfRelic(client, relic.id)
  const existingIds = new Set(existing.map(item => item.id))
  const unique = new Set(ids)

  if (ids.length !== existing.length || unique.size !== ids.length) {
    return { error: 'A ordem tem de incluir todas as mídias da relíquia, sem repetições.' }
  }
  if (ids.some(id => !existingIds.has(id))) {
    return { error: 'A ordem inclui mídias que não pertencem a esta relíquia.' }
  }

  const previous = new Map(existing.map(item => [item.id, item.position]))

  for (const [position, id] of ids.entries()) {
    if (previous.get(id) === position) continue
    const { error } = await client.from('relic_media').update({ position }).eq('id', id)
    if (error) {
      await restorePositions(client, previous)
      return { error: error.message }
    }
  }

  return {}
}

async function restorePositions(
  client: SupabaseClient<Database>,
  positions: Map<string, number>,
): Promise<void> {
  for (const [id, position] of positions) {
    await client.from('relic_media').update({ position }).eq('id', id)
  }
}

/**
 * Points the relic at one of its media items (image or video). The database
 * trigger rejects covers from other relics, but we validate first for a clear
 * error message.
 */
export async function setCover(
  client: SupabaseClient<Database>,
  relic: RelicRow,
  mediaId: string | null,
): Promise<MediaMutationResult> {
  if (mediaId !== null) {
    const media = await findMedia(client, mediaId)
    if (!media || media.relic_id !== relic.id) {
      return { error: 'A capa tem de ser uma mídia desta relíquia.' }
    }
  }

  const coverError = await setCoverId(client, relic.id, mediaId)
  return coverError ? { error: coverError } : { coverMediaId: mediaId }
}

/** Maps a media row onto the public scene shape (used by tests and tools). */
export function mediaToScene(media: MediaRow, coverMediaId: string | null): RelicScene {
  return {
    id: media.id,
    kind: media.type as SceneKind,
    src: media.url,
    poster: media.poster_url || undefined,
    kicker: media.kicker || media.title || '',
    title: media.title || '',
    body: media.caption || '',
    credit: media.credit || '',
    source_url: media.source_url,
    audio_url: media.audio_url,
    mute_video: media.mute_video,
    is_cover: coverMediaId === media.id,
  }
}
