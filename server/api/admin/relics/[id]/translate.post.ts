import { createError, defineEventHandler, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../utils/auth'
import { findRelic } from '../../../../utils/relicInput'
import {
  saveRelicTranslations,
  type ParsedRelicTranslationInput,
} from '../../../../utils/relicTranslations'

/**
 * Traduz todos os textos de uma relíquia (pt → en) com IA e grava-os nas
 * tabelas de tradução. Provider OpenAI-compatível, o mesmo do quiz:
 *   QUIZ_AI_API_KEY / QUIZ_AI_MODEL / QUIZ_AI_BASE_URL
 */

const TARGET_LANG = 'en'

const translatedSchema = z.object({
  name: z.string().max(300).nullish(),
  mission: z.string().max(300).nullish(),
  summary: z.string().max(4000).nullish(),
  story_text: z.string().max(20_000).nullish(),
  alt: z.string().max(1000).nullish(),
  media: z.array(z.object({
    id: z.string(),
    kicker: z.string().max(200).nullish(),
    title: z.string().max(300).nullish(),
    caption: z.string().max(4000).nullish(),
  })).optional(),
  quiz: z.array(z.object({
    id: z.string(),
    question: z.string().max(1000).nullish(),
    options: z.array(z.string()).nullish(),
    explanation: z.string().max(4000).nullish(),
  })).optional(),
})

type Translated = z.infer<typeof translatedSchema>

interface MediaSource {
  id: string
  kicker: string
  title: string
  caption: string
}

interface QuizSource {
  id: string
  question: string
  options: string[]
  explanation: string
}

function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    }
    catch {
      return []
    }
  }
  return []
}

/** Texto vindo da IA, só quando há conteúdo e o original não estava vazio. */
function translated(source: string, value: string | null | undefined): string | undefined {
  if (!source.trim()) return undefined
  const text = value?.trim()
  return text ? text : undefined
}

function buildSource(
  relic: { name: string, mission: string, summary: string, story_text: string, alt: string },
  media: MediaSource[],
  quiz: QuizSource[],
): string {
  return JSON.stringify({
    name: relic.name,
    mission: relic.mission,
    summary: relic.summary,
    story_text: relic.story_text,
    alt: relic.alt,
    media: media.map(item => ({ id: item.id, kicker: item.kicker, title: item.title, caption: item.caption })),
    quiz: quiz.map(item => ({ id: item.id, question: item.question, options: item.options, explanation: item.explanation })),
  }, null, 2)
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const apiKey = process.env.QUIZ_AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'Tradução automática indisponível: configura QUIZ_AI_API_KEY no ambiente.',
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const [mediaRes, quizRes] = await Promise.all([
    supabase
      .from('relic_media')
      .select('id, kicker, title, caption')
      .eq('relic_id', relic.id)
      .order('position'),
    supabase
      .from('quiz_questions')
      .select('id, question, options, explanation')
      .eq('relic_id', relic.id)
      .order('position'),
  ])

  const media: MediaSource[] = (mediaRes.data ?? []).map(row => ({
    id: row.id,
    kicker: row.kicker ?? '',
    title: row.title ?? '',
    caption: row.caption ?? '',
  }))
  const quiz: QuizSource[] = (quizRes.data ?? []).map(row => ({
    id: row.id,
    question: row.question ?? '',
    options: parseOptions(row.options),
    explanation: row.explanation ?? '',
  }))

  const source = buildSource(relic, media, quiz)
  const empty = !relic.name.trim() && !relic.mission.trim() && !relic.summary.trim()
    && !relic.story_text.trim() && !relic.alt.trim() && media.length === 0 && quiz.length === 0
  if (empty) {
    return { ok: true, lang: TARGET_LANG, saved: { relic: false, media: 0, quiz: 0 } }
  }

  const model = process.env.QUIZ_AI_MODEL || 'gpt-4o-mini'
  const baseUrl = (process.env.QUIZ_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)

  let payload: unknown
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'És um tradutor editorial do português para o inglês britânico de um arquivo de relíquias espaciais.',
              'Traduz todos os textos para inglês natural, preciso e adequado a museu.',
              'Preserva nomes próprios, nomes de missões, siglas (NASA, ESA), modelos (Apollo 11, Voyager 1), números, datas e unidades.',
              'Mantém exatamente a mesma estrutura JSON, as mesmas chaves e os mesmos `id`.',
              'Nos `options` de quiz mantém a ordem e o número de opções (é a ordem que define a resposta correta).',
              'Campos vazios permanecem vazios. Não acrescentes comentários nem texto fora do JSON.',
            ].join(' '),
          },
          { role: 'user', content: source },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`provider respondeu ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
    }

    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    const content = json.choices?.[0]?.message?.content
    if (!content) throw new Error('resposta sem conteúdo')

    try {
      payload = JSON.parse(content)
    }
    catch {
      throw new Error('JSON inválido na resposta')
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido'
    throw createError({ statusCode: 502, message: `Falha ao traduzir: ${message}` })
  }
  finally {
    clearTimeout(timer)
  }

  const parsed = translatedSchema.safeParse(payload)
  if (!parsed.success) {
    throw createError({ statusCode: 502, message: 'A IA devolveu uma estrutura inesperada.' })
  }
  const output: Translated = parsed.data

  const mediaById = new Map(media.map(item => [item.id, item]))
  const quizById = new Map(quiz.map(item => [item.id, item]))

  const mediaInput = (output.media ?? []).flatMap((item) => {
    const original = mediaById.get(item.id)
    if (!original) return []
    const kicker = translated(original.kicker, item.kicker)
    const title = translated(original.title, item.title)
    const caption = translated(original.caption, item.caption)
    if (!kicker && !title && !caption) return []
    return [{ media_id: item.id, kicker, title, caption }]
  })

  const quizInput = (output.quiz ?? []).flatMap((item) => {
    const original = quizById.get(item.id)
    if (!original) return []
    const question = translated(original.question, item.question)
    const explanation = translated(original.explanation, item.explanation)
    let options: string[] | undefined
    if (original.options.length > 0 && item.options?.length === original.options.length) {
      const values = item.options.map((option, index) => option.trim() || original.options[index] || '')
      options = values.every(Boolean) ? values : undefined
    }
    if (!question && !options && !explanation) return []
    return [{ question_id: item.id, question, options, explanation }]
  })

  const input: ParsedRelicTranslationInput = {
    name: translated(relic.name, output.name),
    mission: translated(relic.mission, output.mission),
    summary: translated(relic.summary, output.summary),
    story_text: translated(relic.story_text, output.story_text),
    alt: translated(relic.alt, output.alt),
    media: mediaInput,
    quiz: quizInput,
  }

  const result = await saveRelicTranslations(supabase, relic.id, TARGET_LANG, input)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return { ok: true, lang: TARGET_LANG, saved: result.saved }
})
