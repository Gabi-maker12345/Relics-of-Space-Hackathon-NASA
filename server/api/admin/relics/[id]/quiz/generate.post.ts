import { createError, defineEventHandler, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../../../utils/auth'
import { findRelic } from '../../../../../utils/relicInput'
import {
  MAX_QUIZ_QUESTIONS,
  loadQuizDto,
  quizQuestionInputSchema,
  replaceQuiz,
} from '../../../../../utils/quiz'

/**
 * Gera 8 perguntas com IA a partir dos dados da relíquia.
 *
 * Provider OpenAI-compatível, configurável por env (a key ainda não existe no
 * projeto; sem `QUIZ_AI_API_KEY` devolve 503):
 *   QUIZ_AI_API_KEY   chave do provider
 *   QUIZ_AI_MODEL     default `gpt-4o-mini`
 *   QUIZ_AI_BASE_URL  default `https://api.openai.com/v1`
 */

const EXPECTED_QUESTIONS = MAX_QUIZ_QUESTIONS

const aiResponseSchema = z.union([
  z.object({ questions: z.array(z.unknown()) }),
  z.array(z.unknown()),
])

function buildContext(relic: {
  name: string
  mission: string
  summary: string
  story_text: string
}, facts: { label: string, value: string }[], captions: string[]): string {
  const lines = [
    `Nome: ${relic.name}`,
    `Missão: ${relic.mission}`,
    `Resumo: ${relic.summary}`,
    `História: ${relic.story_text}`,
  ]
  if (facts.length > 0) {
    lines.push(`Ficha técnica: ${facts.map(fact => `${fact.label}: ${fact.value}`).join('; ')}`)
  }
  if (captions.length > 0) {
    lines.push(`Cenas narradas: ${captions.join(' | ')}`)
  }
  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const apiKey = process.env.QUIZ_AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'Geração automática indisponível: configura QUIZ_AI_API_KEY no ambiente.',
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic) throw createError({ statusCode: 404, message: 'Relic not found' })

  const [factsRes, mediaRes] = await Promise.all([
    supabase.from('relic_facts').select('label, value').eq('relic_id', relic.id).order('position'),
    supabase.from('relic_media').select('caption, title, kicker').eq('relic_id', relic.id).order('position'),
  ])
  const facts = (factsRes.data ?? []) as { label: string, value: string }[]
  const captions = (mediaRes.data ?? [])
    .map(item => item.caption?.trim() || item.title?.trim() || item.kicker?.trim() || '')
    .filter(Boolean)

  const model = process.env.QUIZ_AI_MODEL || 'gpt-4o-mini'
  const baseUrl = (process.env.QUIZ_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)

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
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'És um autor de quizzes em português europeu para um arquivo de relíquias espaciais.',
              `Gera exatamente ${EXPECTED_QUESTIONS} perguntas de escolha múltipla com 4 opções cada.`,
              'Cada pergunta tem de poder ser respondida apenas com os dados fornecidos.',
              'Devolve APENAS JSON válido no formato:',
              '{"questions":[{"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"..."}]}',
              'correct_index é o índice (0-3) da opção correta. explanation é uma frase curta.',
            ].join(' '),
          },
          { role: 'user', content: buildContext(relic, facts, captions) },
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
    throw createError({ statusCode: 502, message: `Falha ao gerar o quiz: ${message}` })
  }
  finally {
    clearTimeout(timer)
  }

  const envelope = aiResponseSchema.safeParse(payload)
  if (!envelope.success) {
    throw createError({ statusCode: 502, message: 'A IA devolveu uma estrutura inesperada.' })
  }
  const rawQuestions = Array.isArray(envelope.data) ? envelope.data : envelope.data.questions
  if (rawQuestions.length !== EXPECTED_QUESTIONS) {
    throw createError({
      statusCode: 502,
      message: `A IA devolveu ${rawQuestions.length} perguntas (esperadas ${EXPECTED_QUESTIONS}).`,
    })
  }

  const questions = rawQuestions.map((item, index) => {
    const parsed = quizQuestionInputSchema.safeParse(item)
    if (!parsed.success) {
      throw createError({
        statusCode: 502,
        message: `A pergunta ${index + 1} veio inválida: ${parsed.error.issues[0]?.message ?? 'formato desconhecido'}.`,
      })
    }
    return parsed.data
  })

  const result = await replaceQuiz(supabase, relic, questions)
  if (result.error) throw createError({ statusCode: 400, message: result.error })

  return loadQuizDto(supabase, relic)
})
