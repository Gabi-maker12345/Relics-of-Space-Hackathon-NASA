// Mock equivalente ao What Nuxt payload entrega (CLONE_SPEC.md §3/§4). Textos verbatim §§8/4.
export type MediaKind = 'image' | 'video'

export interface Media {
  id: string
  kind: MediaKind
  src: string
  poster?: string
  ratio: string
  label: string
}

export type Project = {
  id: string
  slug: string
  title: string
  description: string
  excerpt: string // resumo curto pintado no card — o original usa um texto próprio do CMS; casa-di-solare observado do screenshot, demais [NÃO DETERMINADO] → primeira ideia do description
  meta: string[] // chips do painel de projeto (casa: UNSEEN/2024 observados; demais [NÃO DETERMINADO] → vazio)
  ratio: string // aspect-ratio inline, ex: "2048 / 1172"
  texture: string // placeholder público (sem assets originais)
  media: Media[] // 4 passos do visualizador; imagens reais de relíquias + vídeo gerado
}

const mediaLibrary = (offset: number): Media[] => {
  const pool: Media[] = [
    { id: 'apollo', kind: 'image', src: '/images/relics/apollo-lunar-module.jpg', ratio: '16 / 10', label: 'Módulo Lunar Apollo' },
    { id: 'opportunity', kind: 'image', src: '/images/relics/opportunity.jpg', ratio: '16 / 10', label: 'Opportunity em Marte' },
    {
      id: 'loop',
      kind: 'video',
      src: '/media/relic-loop.mp4',
      poster: '/images/relics/opportunity.jpg',
      ratio: '16 / 9',
      label: 'Vídeo — órbita de aproximação',
    },
    { id: 'viking', kind: 'image', src: '/images/relics/viking-1.jpg', ratio: '16 / 10', label: 'Viking 1' },
  ]
  return [...pool.slice(offset % pool.length), ...pool.slice(0, offset % pool.length)]
}

export const projects: Project[] = [
  {
    id: 'nathan-riley',
    slug: '/projects/nathan-riley',
    title: 'Nathan Riley',
    description:
      '— Nathan is a UK-based digital creative specializing in art direction, surrealist 3D visuals, interactive experiences, and motion design.',
    excerpt: 'Art direction, surrealist 3D visuals, interactive experiences and motion design.',
    meta: [],
    ratio: '2048 / 1172',
    texture: '/placeholders/card-nathan-riley.svg',
    media: mediaLibrary(0),
  },
  {
    id: 'casa-di-solare',
    slug: '/projects/casa-di-solare',
    title: 'Casa Di Solare',
    description:
      '— Solare extends Nikolas Type‘s Font Catalogue with a timeless, hyper-useable quintessential variable font, suitable for a wide field of applications.',
    excerpt: 'A contemporary versatile display typeface from [Nikolas Type].',
    meta: ['UNSEEN', '2024'],
    ratio: '2048 / 1204',
    texture: '/placeholders/card-casa-di-solare.svg',
    media: mediaLibrary(1),
  },
  {
    id: 'the-lookback',
    slug: '/projects/the-lookback',
    title: 'The Lookback',
    description:
      '— Digital capsule for Better Off® studio to document what inspired them and what they created over the last months/years.',
    excerpt: 'A digital capsule for Better Off® studio.',
    meta: [],
    ratio: '1250 / 720',
    texture: '/placeholders/card-the-lookback.svg',
    media: mediaLibrary(2),
  },
  {
    id: 'book-of-happiness',
    slug: '/projects/book-of-happiness',
    title: 'Book of Happiness',
    description:
      '— Helping leaders keep themselves and their people happy and mentally healthy.',
    excerpt: 'Helping leaders keep themselves and their people happy and mentally healthy.',
    meta: [],
    ratio: '2048 / 1114',
    texture: '/placeholders/card-book-of-happiness.svg',
    media: mediaLibrary(3),
  },
  {
    id: 'dogelon-mars',
    slug: '/projects/dogelon-mars',
    title: 'Dogelon Mars',
    description:
      '— Follow the story of Dogelon Mars as he explores the greatest mysteries of the universe and seeks to return to the planet he once called home with the help of the friends he’s made during his intergalactic travels.',
    excerpt: 'Follow Dogelon Mars exploring the mysteries of the universe.',
    meta: [],
    ratio: '3360 / 2200',
    texture: '/placeholders/card-dogelon-mars.svg',
    media: mediaLibrary(4),
  },
  {
    id: 'gil-huybrecht',
    slug: '/projects/gil-huybrecht',
    title: 'Gil Huybrecht',
    description:
      '— Gil Huybrecht is a Belgian digital designer and art director, based around Antwerp. He specializes in typography-heavy web design, art direction, interaction design, and branding.',
    excerpt: 'Typography-heavy web design, art direction, interaction design and branding.',
    meta: [],
    ratio: '1196 / 720',
    texture: '/placeholders/card-gil-huybrecht.svg',
    media: mediaLibrary(5),
  },
  {
    id: 'discoveryland',
    slug: '/projects/discoveryland',
    title: 'Discoveryland',
    description:
      '— Partnered with Outpost and Discovery Land Company to create an immersive, storytelling brand experience that showcasing DLCs international portfolio and capabilities while acting as a seamless transition across their 23 properties.',
    excerpt: 'An immersive, storytelling brand experience for Discovery Land Company.',
    meta: [],
    ratio: '1372 / 1029',
    texture: '/placeholders/card-discoveryland.svg',
    media: mediaLibrary(6),
  },
  {
    id: 'griflan',
    slug: '/projects/griflan',
    title: 'Griflan',
    description:
      '— Griflan is a creative studio at the intersection of design, strategy, and compelling storytelling, shaping brands that move culture and leave a lasting mark.',
    excerpt: 'A creative studio shaping brands that move culture.',
    meta: [],
    ratio: '1162 / 720',
    texture: '/placeholders/card-griflan.svg',
    media: mediaLibrary(7),
  },
]

export const about: { bio: string; awards: string; awardsNum: string } = {
  bio: 'Jesper Landberg, Swedish design engineer, named Awwwards Independent of the Year in 2022 and 2024, building visually rich, motion-driven websites. Usually lead or sole developer, responsible for front-end architecture, animation, interaction and CMS, alongside international agencies and creative teams.',
  awards: '77 awards — 30× Awwwards, 40× FWA, 3× Webby, 2× Lovie.',
  awardsNum: '77',
}
