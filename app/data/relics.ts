import type {
  Relic,
  RelicFact,
  RelicLocation,
  RelicScene,
  RelicStatus,
  RelicStep,
} from '#shared/types/relic'
import dataset from '../../data/relics.json'

export type { Relic, RelicFact, RelicScene, SceneKind } from '#shared/types/relic'

interface SeedMedia {
  id: string
  file: string
  type: 'image' | 'video'
  poster_url?: string | null
  kicker: string
  title: string
  caption: string
  credit: string
  source_url: string
  audio_url?: string | null
}

/**
 * Shape of one entry in `data/relics.json`. The same file feeds
 * `supabase/seed.sql` (via `scripts/generate-seed.mjs`), so the SSR fallback
 * and the database always describe the same relics.
 */
export interface SeedRelic {
  id: string
  slug: string
  name: string
  mission: string
  summary: string
  story_text: string
  status: RelicStatus
  location: RelicLocation
  published: boolean
  alt: string
  ratio: string
  reference_url: string
  is_extra: boolean
  intro_audio_url?: string | null
  facts: RelicFact[]
  media: SeedMedia[]
}

const seed = dataset.relics as unknown as SeedRelic[]

function toScene(media: SeedMedia, isCover: boolean): RelicScene {
  return {
    id: media.id,
    kind: media.type,
    src: `/images/relics/${media.file}`,
    poster: media.poster_url ?? undefined,
    kicker: media.kicker,
    title: media.title,
    body: media.caption,
    credit: media.credit,
    source_url: media.source_url,
    audio_url: media.audio_url ?? null,
    is_cover: isCover,
  }
}

/** Mirrors the API mapper so the SSR shell already has a narration script. */
function withSteps(relic: Relic): Relic {
  const steps: RelicStep[] = [
    {
      index: 0,
      type: 'intro',
      title: relic.name,
      caption: relic.tagline || relic.body || relic.name,
      audio_url: relic.intro_audio_url ?? null,
    },
    ...relic.scenes.map((scene, position) => ({
      index: position + 1,
      type: scene.kind,
      media_id: scene.id,
      title: scene.title || scene.kicker || relic.name,
      caption: scene.body,
      audio_url: scene.audio_url ?? null,
      src: scene.src,
      poster: scene.poster,
      credit: scene.credit || '',
    })),
  ]

  return { ...relic, steps, total_steps: steps.length }
}

export const relics: Relic[] = seed.map((entry) => {
  const scenes = entry.media.map((media, index) => toScene(media, index === 0))
  const cover = scenes[0]

  return withSteps({
    id: entry.slug,
    name: entry.name,
    mission: entry.mission,
    tagline: entry.summary,
    body: entry.story_text,
    facts: entry.facts.map(fact => ({ ...fact })),
    image: cover?.src ?? '',
    alt: entry.alt,
    ratio: entry.ratio,
    scenes,
    steps: [],
    total_steps: 0,
    published: entry.published,
    status: entry.status,
    location: entry.location,
    reference_url: entry.reference_url,
    is_extra: entry.is_extra,
    intro_audio_url: entry.intro_audio_url ?? null,
  })
})

export const missionMarquee = [
  'Apollo 11',
  'Apollo 12',
  'Apollo 14',
  'Apollo 15',
  'Apollo 16',
  'Apollo 17',
  ...relics.map(relic => relic.name),
]

export const heroCopy = {
  title: 'Space Relics',
  deck: 'Um arquivo vivo das máquinas que a humanidade deixou na Lua, em Marte e no espaço profundo.',
  phaseTwo: 'Abandonados, mas não esquecidos.',
  phaseTwoDeck: 'Cada relíquia guarda um diário de missão. Desça para ouvir o que elas têm para contar.',
}
