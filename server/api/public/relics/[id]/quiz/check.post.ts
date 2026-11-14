import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { z } from 'zod'
import type { Database } from '~/types/database.types'
import { findRelic } from '../../../../../utils/relicInput'

/**
 * Corrige uma resposta do quiz público.
 *
 * O detalhe público esconde `correct_index`, por isso a correção acontece aqui:
 * devolve se acertou, qual era a certa e a explicação. A relíquia tem de estar
 * publicada; perguntas de outra relíquia são rejeitadas.
 */

const answerSchema = z.object({
  question_id: z.string().uuid('Identificador de pergunta inválido.'),
  option_index: z.number().int().min(0, 'Opção inválida.'),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id or slug' })

  const parsed = answerSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Resposta inválida' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = await findRelic(supabase, id)
  if (!relic || !relic.published) {
    throw createError({ statusCode: 404, message: 'Relic not found' })
  }

  const { data: question, error } = await supabase
    .from('quiz_questions')
    .select('id, relic_id, correct_index, explanation')
    .eq('id', parsed.data.question_id)
    .eq('relic_id', relic.id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: 'Falha ao validar a resposta.' })
  if (!question) throw createError({ statusCode: 404, message: 'Question not found' })

  const correctIndex = question.correct_index
  const correct = parsed.data.option_index === correctIndex

  return {
    correct,
    correct_index: correctIndex,
    explanation: question.explanation || '',
  }
})
