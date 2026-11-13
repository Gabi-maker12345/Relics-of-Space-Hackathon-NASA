import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import type { Database } from '../../app/types/database.types'
import { getPublicRelicDetail } from '../../server/utils/publicRelics'
import {
  addQuestion,
  deleteQuestion,
  findQuestion,
  loadQuizDto,
  questionsOfRelic,
  reorderQuestions,
  updateQuestion,
} from '../../server/utils/quiz'
import type { ParsedQuizQuestionInput } from '../../server/utils/quiz'

try {
  loadEnvFile()
}
catch {
  // ignore
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
const serviceKey = process.env.NUXT_SUPABASE_SECRET_KEY || ''

type RelicRow = Database['public']['Tables']['relics']['Row']

describe.skipIf(!serviceKey || !anonKey)('quiz CRUD (BE-13 integration)', () => {
  const admin = createClient<Database>(url, serviceKey || 'placeholder', { auth: { persistSession: false } })
  const anon = createClient<Database>(url, anonKey || 'placeholder', { auth: { persistSession: false } })

  const slug = `quiz-test-${randomUUID().slice(0, 8)}`
  let relic = {} as RelicRow

  const createMockEvent = (path: string): H3Event => {
    const headers: Record<string, string> = {}
    return {
      path,
      context: { params: {} },
      node: {
        req: { url: path },
        res: {
          setHeader: (name: string, value: string) => {
            headers[name.toLowerCase()] = value
          },
          getHeader: (name: string) => headers[name.toLowerCase()],
        },
      },
      __query: {},
    } as unknown as H3Event
  }

  const input = (overrides: Partial<ParsedQuizQuestionInput> = {}): ParsedQuizQuestionInput => ({
    question: 'Em que ano pousou o Apollo 11?',
    options: ['1968', '1969', '1970'],
    correct_index: 1,
    explanation: 'O Apollo 11 pousou em 1969.',
    ...overrides,
  })

  beforeAll(async () => {
    const { data, error } = await admin
      .from('relics')
      .insert({
        slug,
        name: 'Quiz Test Rover',
        mission: 'Test',
        summary: 'Relíquia de teste.',
        story_text: 'História de teste.',
        status: 'active',
        location: 'mars',
        published: true,
      })
      .select()
      .single()

    expect(error).toBeNull()
    relic = data as RelicRow
  })

  beforeEach(async () => {
    await admin.from('quiz_questions').delete().eq('relic_id', relic.id)
  })

  afterAll(async () => {
    if (relic?.id) await admin.from('relics').delete().eq('id', relic.id)
  })

  it('adds questions in order and caps the quiz at five', async () => {
    for (let index = 0; index < 5; index++) {
      const result = await addQuestion(admin, relic, input({
        question: `Pergunta ${index}`,
        correct_index: index % 3,
      }))
      expect(result.error).toBeUndefined()
    }

    const rows = await questionsOfRelic(admin, relic.id)
    expect(rows.map(row => row.position)).toEqual([0, 1, 2, 3, 4])

    const sixth = await addQuestion(admin, relic, input({ question: 'Pergunta 6' }))
    expect(sixth.error).toMatch(/no máximo 5 perguntas/)
    expect(await questionsOfRelic(admin, relic.id)).toHaveLength(5)
  })

  it('inserts at a position and shifts the following questions', async () => {
    for (let index = 0; index < 3; index++) {
      await addQuestion(admin, relic, input({ question: `Pergunta ${index}` }))
    }

    const inserted = await addQuestion(admin, relic, input({
      question: 'Pergunta nova',
      position: 1,
    }))
    expect(inserted.error).toBeUndefined()

    const rows = await questionsOfRelic(admin, relic.id)
    expect(rows.map(row => row.question)).toEqual([
      'Pergunta 0',
      'Pergunta nova',
      'Pergunta 1',
      'Pergunta 2',
    ])
    expect(rows.map(row => row.position)).toEqual([0, 1, 2, 3])
  })

  it('updates a question and validates the answer against the merged options', async () => {
    await addQuestion(admin, relic, input())
    const [question] = await questionsOfRelic(admin, relic.id)

    const updated = await updateQuestion(admin, question, {
      options: ['1969', '1972'],
      correct_index: 0,
      explanation: 'Só duas opções.',
    })
    expect(updated.error).toBeUndefined()
    expect(updated.question?.options).toEqual(['1969', '1972'])
    expect(updated.question?.correct_index).toBe(0)

    const invalid = await updateQuestion(admin, updated.question!, { correct_index: 2 })
    expect(invalid.error).toMatch(/opção existente/)

    const shrunk = await addQuestion(admin, relic, input({
      question: 'Outra pergunta',
      options: ['a', 'b', 'c', 'd'],
      correct_index: 3,
    }))
    expect(shrunk.error).toBeUndefined()
    const other = (await questionsOfRelic(admin, relic.id)).find(row => row.question === 'Outra pergunta')!
    const outOfRange = await updateQuestion(admin, other, { options: ['a', 'b'] })
    expect(outOfRange.error).toMatch(/opção existente/)
  })

  it('reorders the quiz and rejects partial or foreign lists', async () => {
    for (let index = 0; index < 3; index++) {
      await addQuestion(admin, relic, input({ question: `Pergunta ${index}` }))
    }
    const rows = await questionsOfRelic(admin, relic.id)
    const [first, second, third] = rows

    const result = await reorderQuestions(admin, relic, [third.id, first.id, second.id])
    expect(result.error).toBeUndefined()

    const reordered = await questionsOfRelic(admin, relic.id)
    expect(reordered.map(row => row.question)).toEqual(['Pergunta 2', 'Pergunta 0', 'Pergunta 1'])
    expect(reordered.map(row => row.position)).toEqual([0, 1, 2])

    expect((await reorderQuestions(admin, relic, [third.id])).error).toMatch(/todas as perguntas/)
    expect((await reorderQuestions(admin, relic, [third.id, third.id, first.id])).error).toMatch(/sem repetições/)
    expect((await reorderQuestions(admin, relic, [third.id, first.id, randomUUID()])).error).toMatch(/não pertencem/)
  })

  it('delivers the quiz publicly without the correct answer', async () => {
    await addQuestion(admin, relic, input())

    const detail = await getPublicRelicDetail(anon, createMockEvent(`/api/public/relics/${slug}`), slug)
    expect(detail.quiz).toHaveLength(1)
    expect(detail.quiz?.[0]).toMatchObject({
      question: 'Em que ano pousou o Apollo 11?',
      options: ['1968', '1969', '1970'],
      explanation: 'O Apollo 11 pousou em 1969.',
    })
    expect(detail.quiz?.[0].correct_index).toBeUndefined()

    const adminQuiz = await loadQuizDto(admin, relic)
    expect(adminQuiz.quiz[0].correct_index).toBe(1)
  })

  it('deletes a question and its translations', async () => {
    await addQuestion(admin, relic, input())
    const [question] = await questionsOfRelic(admin, relic.id)

    await admin.from('quiz_question_translations').insert({
      question_id: question.id,
      lang: 'en',
      question: 'Which year?',
      options: ['1968', '1969', '1970'],
      explanation: 'Apollo 11 landed in 1969.',
    })

    const result = await deleteQuestion(admin, question)
    expect(result.error).toBeUndefined()
    expect(await findQuestion(admin, question.id)).toBeNull()
    expect(await questionsOfRelic(admin, relic.id)).toHaveLength(0)

    const { data: translations } = await admin
      .from('quiz_question_translations')
      .select('question_id')
      .eq('question_id', question.id)
    expect(translations).toHaveLength(0)
  })
})
