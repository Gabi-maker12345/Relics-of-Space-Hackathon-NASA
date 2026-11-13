import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { RelicFact, RelicScene } from '#shared/types/relic'

type RelicRow = Database['public']['Tables']['relics']['Row']
type RelicInsert = Database['public']['Tables']['relics']['Insert']
type RelicUpdate = Database['public']['Tables']['relics']['Update']
type FactInsert = Database['public']['Tables']['relic_facts']['Insert']
type MediaInsert = Database['public']['Tables']['relic_media']['Insert']
type MediaRow = Database['public']['Tables']['relic_media']['Row']
type FactRow = Database['public']['Tables']['relic_facts']['Row']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Identificador inválido.').max(80)

const factSchema = z.object({
  label: z.string().trim().min(1, 'Cada facto precisa de rótulo.'),
  value: z.string().trim().min(1, 'Cada facto precisa de valor.'),
})

const sceneSchema = z.object({
  kind: z.enum(['image', 'video']),
  src: z.string().trim().min(1, 'Cada cena precisa de mídia.'),
  poster: z.string().optional(),
  kicker: z.string().default(''),
  title: z.string().optional(),
  body: z.string().default(''),
  credit: z.string().optional(),
  source_url: z.string().optional().nullable(),
  audio_url: z.string().optional().nullable(),
  mute_video: z.boolean().optional(),
})

export const relicInputSchema = z.object({
  slug: slugSchema.optional(),
  name: z.string().trim().min(1, 'Dá um nome à relíquia.').max(160),
  mission: z.string().max(200).optional(),
  tagline: z.string().max(320).optional(),
  body: z.string().optional(),
  image: z.string().optional(),
  alt: z.string().max(400).optional(),
  ratio: z.string().max(40).optional(),
  published: z.boolean().optional(),
  status: z.enum(['active', 'silent', 'lost']).optional(),
  location: z.enum(['moon', 'mars', 'deep_space']).optional(),
  intro_audio_url: z.string().optional(),
  facts: z.array(factSchema).optional(),
  scenes: z.array(sceneSchema).optional(),
})

export const relicPatchSchema = relicInputSchema.partial().extend({
  name: z.string().trim().min(1).max(160).optional(),
})

export type ParsedRelicInput = z.infer<typeof relicInputSchema>
export type ParsedRelicPatch = z.infer<typeof relicPatchSchema>

export const DEFAULT_RATIO = '1376 / 768'

/**
 * The card cover is the `cover_media_id` row, so it must be one of the scenes.
 * Empty covers are allowed (the mapper falls back to the first image scene).
 */
export function validateCover(scenes: RelicScene[] | undefined, image: string | undefined): string | null {
  if (!image || !scenes) return null
  // A video cover is identified by its poster frame, which is what the form
  // sends as the card image.
  if (scenes.some(scene => scene.src === image || scene.poster === image)) return null
  return 'A imagem do cartão tem de corresponder a uma das cenas.'
}

/** Normalises the shared rules into a row ready for insert. */
export function toRelicInsert(input: ParsedRelicInput, slug: string): RelicInsert {
  return {
    slug,
    name: input.name,
    mission: input.mission ?? '',
    summary: input.tagline ?? '',
    story_text: input.body ?? '',
    alt: input.alt ?? '',
    ratio: input.ratio || DEFAULT_RATIO,
    published: input.published ?? false,
    status: input.status ?? 'active',
    location: input.location ?? 'moon',
    intro_audio_url: input.intro_audio_url ?? null,
  }
}

/** Only the fields the request actually sent, so a publish toggle touches one column. */
export function toRelicPatch(input: ParsedRelicPatch): RelicUpdate {
  const patch: RelicUpdate = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.mission !== undefined) patch.mission = input.mission
  if (input.tagline !== undefined) patch.summary = input.tagline
  if (input.body !== undefined) patch.story_text = input.body
  if (input.alt !== undefined) patch.alt = input.alt
  if (input.ratio !== undefined) patch.ratio = input.ratio || DEFAULT_RATIO
  if (input.published !== undefined) patch.published = input.published
  if (input.status !== undefined) patch.status = input.status
  if (input.location !== undefined) patch.location = input.location
  if (input.intro_audio_url !== undefined) patch.intro_audio_url = input.intro_audio_url
  return patch
}

export interface RelicChildren {
  facts?: RelicFact[]
  scenes?: RelicScene[]
  /** Preferred cover URL; must match one of the scenes (see `validateCover`). */
  cover?: string
}

async function fetchChildren(client: SupabaseClient<Database>, relicId: string) {
  const [facts, media] = await Promise.all([
    client.from('relic_facts').select('*').eq('relic_id', relicId).order('position'),
    client.from('relic_media').select('*').eq('relic_id', relicId).order('position'),
  ])
  return { facts: (facts.data ?? []) as FactRow[], media: (media.data ?? []) as MediaRow[] }
}

function sceneToRow(relicId: string, scene: RelicScene, position: number): MediaInsert {
  return {
    relic_id: relicId,
    type: scene.kind,
    url: scene.src,
    poster_url: scene.poster || null,
    kicker: scene.kicker || '',
    title: scene.title || '',
    caption: scene.body || '',
    credit: scene.credit || '',
    source_url: scene.source_url || null,
    audio_url: scene.audio_url || null,
    position,
    mute_video: scene.mute_video ?? scene.kind === 'video',
  }
}

/**
 * Replaces facts and/or scenes. Omitted lists are left untouched, which makes
 * partial updates (publish, rename) cheap.
 *
 * supabase-js has no multi-statement transaction, so failures are compensated
 * by re-inserting the rows that were deleted. The old rows keep their ids.
 */
export async function replaceRelicChildren(
  client: SupabaseClient<Database>,
  relicId: string,
  children: RelicChildren,
): Promise<{ coverMediaId?: string | null, error?: string }> {
  const replaceFacts = children.facts !== undefined
  const replaceScenes = children.scenes !== undefined
  const updateCover = replaceScenes || children.cover !== undefined
  if (!replaceFacts && !replaceScenes && !updateCover) return {}

  const previous = await fetchChildren(client, relicId)

  if (replaceFacts) {
    const { error } = await client.from('relic_facts').delete().eq('relic_id', relicId)
    if (error) return { error: error.message }
  }
  if (replaceScenes) {
    const { error } = await client.from('relic_media').delete().eq('relic_id', relicId)
    if (error) return { error: error.message }
  }

  const restore = async () => {
    if (replaceScenes) {
      const rows = previous.media.map(m => ({ ...m }) as MediaInsert)
      if (rows.length) await client.from('relic_media').insert(rows)
    }
    if (replaceFacts) {
      const rows = previous.facts.map(f => ({ ...f }) as FactInsert)
      if (rows.length) await client.from('relic_facts').insert(rows)
    }
  }

  if (replaceFacts && children.facts?.length) {
    const rows = children.facts.map((fact, position) => ({
      relic_id: relicId,
      label: fact.label,
      value: fact.value,
      position,
    }))
    const { error } = await client.from('relic_facts').insert(rows)
    if (error) {
      await restore()
      return { error: error.message }
    }
  }

  let insertedMedia: MediaRow[] = []
  if (replaceScenes) {
    if (children.scenes?.length) {
      const rows = children.scenes.map((scene, position) => sceneToRow(relicId, scene, position))
      const { data, error } = await client.from('relic_media').insert(rows).select()
      if (error) {
        await restore()
        return { error: error.message }
      }
      insertedMedia = data ?? []
    }
  }
  else if (previous.media.length) {
    insertedMedia = previous.media
  }

  if (!updateCover) return {}
  return { coverMediaId: pickCoverId(insertedMedia, children.cover) }
}

/**
 * Resolves the cover row: the first media item whose URL the caller marked as
 * `image`, otherwise the first image scene.
 */
export function pickCoverId(media: Pick<MediaRow, 'id' | 'type' | 'url' | 'poster_url'>[], image?: string): string | null {
  if (image) {
    const explicit = media.find(item => item.url === image || item.poster_url === image)
    if (explicit) return explicit.id
  }
  return media.find(item => item.type === 'image')?.id ?? null
}

/** Finds a relic by slug (preferred) or UUID. */
export async function findRelic(
  client: SupabaseClient<Database>,
  idOrSlug: string,
): Promise<RelicRow | null> {
  if (!idOrSlug) return null
  const column = isUuid(idOrSlug) ? 'id' : 'slug'
  const { data, error } = await client
    .from('relics')
    .select('*')
    .eq(column, idOrSlug)
    .maybeSingle()

  if (error) return null
  return data
}
