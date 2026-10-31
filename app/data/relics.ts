export interface RelicFact {
  label: string
  value: string
}

export type SceneKind = 'image' | 'video'

export interface RelicScene {
  kind: SceneKind
  src: string
  poster?: string
  kicker: string
  body: string
}

export interface Relic {
  id: string
  name: string
  mission: string
  tagline: string
  body: string
  facts: RelicFact[]
  image: string
  alt: string
  ratio: string
  scenes: RelicScene[]
}

export const relics: Relic[] = [
  {
    id: 'apollo-lunar-module',
    name: 'Módulo Lunar Apollo',
    mission: 'Apollo 11–17 · 1969–1972',
    tagline: 'Seis pousos, seis módulos deixados para trás.',
    body: 'O estágio de descida do módulo lunar nunca voltou para casa: ficou na superfície depois de servir de plataforma de lançamento para o estágio de subida. Seis deles continuam onde pousaram, do Mar da Tranquilidade a Taurus-Littrow.',
    facts: [
      { label: 'Primeiro pouso', value: '20 jul 1969' },
      { label: 'Massa (descida)', value: '~10 t' },
      { label: 'Locais', value: '6 na Lua' },
      { label: 'Última visita', value: 'dez 1972' },
    ],
    image: '/images/relics/apollo-lunar-module.jpg',
    alt: 'Módulo lunar Apollo em exposição, com o estágio de descida dourado e as pernas de pouso',
    ratio: '1376 / 768',
    scenes: [
      {
        kind: 'image',
        src: '/images/relics/apollo-lunar-module.jpg',
        kicker: 'Fotografia',
        body: 'O estágio de descida ficou na superfície depois de servir de plataforma de lançamento para o estágio de subida. Seis bases continuam onde pousaram, entre o Mar da Tranquilidade e Taurus-Littrow.',
      },
      {
        kind: 'video',
        src: '/media/apollo-loop.mp4',
        poster: '/images/relics/apollo-lunar-module.jpg',
        kicker: 'Transmissão',
        body: 'O que sobrou são seis bases, seis bandeiras e instrumentos que ainda refletem lasers disparados da Terra — a única presença humana permanente fora do planeta.',
      },
    ],
  },
  {
    id: 'opportunity',
    name: 'Opportunity',
    mission: 'Mars Exploration Rover · 2004–2018',
    tagline: 'Uma maratona de 45 km em outro mundo.',
    body: 'Pousou em Meridiani Planum em janeiro de 2004, contratado para 90 dias. Encontrou provas de água líquida no passado, percorreu 45,16 km — mais do que qualquer outro veículo em outro planeta — e ficou em silêncio quando uma tempestade de poeira cobriu o Sol, em junho de 2018.',
    facts: [
      { label: 'Pouso', value: '25 jan 2004' },
      { label: 'Distância', value: '45,16 km' },
      { label: 'Tempo ativo', value: '14 anos' },
      { label: 'Último sinal', value: '10 jun 2018' },
    ],
    image: '/images/relics/opportunity.jpg',
    alt: 'Rover Opportunity em Marte, com painéis solares cobertos de poeira e o mastro da câmara erguido',
    ratio: '1408 / 768',
    scenes: [
      {
        kind: 'image',
        src: '/images/relics/opportunity.jpg',
        kicker: 'Fotografia',
        body: 'Pousou em Meridiani Planum em janeiro de 2004, contratado para 90 dias. Encontrou provas de água líquida, percorreu 45,16 km e ficou em silêncio quando uma tempestade de poeira cobriu o Sol, em junho de 2018.',
      },
      {
        kind: 'video',
        src: '/media/relic-loop.mp4',
        poster: '/images/relics/opportunity.jpg',
        kicker: 'Transmissão',
        body: 'A NASA tentou chamá-lo mais de mil vezes depois da tempestade. O veículo continua no vale Perseverance, na borda da cratera Endeavour, a 45 quilómetros do ponto onde tudo começou.',
      },
    ],
  },
  {
    id: 'viking-1',
    name: 'Viking 1',
    mission: 'Viking · 1976–1982',
    tagline: 'A primeira nave a trabalhar em Marte.',
    body: 'Pousou em Chryse Planitia a 20 de julho de 1976 e operou durante seis anos, enviando as primeiras imagens da superfície marciana e procurando sinais de vida. Continua em Marte, em silêncio desde 1982.',
    facts: [
      { label: 'Pouso', value: '20 jul 1976' },
      { label: 'Operação', value: '6 anos' },
      { label: 'Marco', value: '1.ª missão a operar em Marte' },
      { label: 'Último contato', value: '11 nov 1982' },
    ],
    image: '/images/relics/viking-1.jpg',
    alt: 'Lander Viking 1 com o corpo hexagonal, os três painéis solares e a antena de alto ganho',
    ratio: '1376 / 768',
    scenes: [
      {
        kind: 'image',
        src: '/images/relics/viking-1.jpg',
        kicker: 'Fotografia',
        body: 'Pousou em Chryse Planitia a 20 de julho de 1976 e operou durante seis anos, enviando as primeiras imagens da superfície marciana e procurando sinais de vida.',
      },
      {
        kind: 'video',
        src: '/media/viking-loop.mp4',
        poster: '/images/relics/viking-1.jpg',
        kicker: 'Transmissão',
        body: 'As suas imagens e dados abriram caminho a todas as missões que se seguiram. Continua em Marte, em silêncio desde 1982.',
      },
    ],
  },
]

export const missionMarquee = [
  'Apollo 11',
  'Apollo 12',
  'Apollo 14',
  'Apollo 15',
  'Apollo 16',
  'Apollo 17',
  'Opportunity',
  'Spirit',
  'Viking 1',
  'Sojourner',
  'Ingenuity',
  'Lunokhod 1',
]

export const heroCopy = {
  title: 'Space Relics',
  deck: 'Um arquivo vivo das máquinas que a humanidade deixou na Lua, em Marte e no espaço profundo.',
  phaseTwo: 'Abandonados, mas não esquecidos.',
  phaseTwoDeck: 'Cada relíquia guarda um diário de missão. Desça para ouvir o que elas têm para contar.',
}
