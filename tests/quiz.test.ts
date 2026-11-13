import { describe, expect, it } from 'vitest'
import type { Database } from '../app/types/database.types'
import { mapDbToRelic } from '../server/utils/relicMapper'
import {
  quizOrderSchema,
  quizQuestionInputSchema,
  quizQuestionPatchSchema,
  quizRowToDto,
} from '../server/utils/quiz'

type QuizRow = Database['public']['Tables']['quiz_questions']['Row']
type RelicRow = Database['public']['Tables']['relics']['Row']

const validQuestion = {
  question: 'Em que ano pousou o Apollo 11?',
  options: ['1968', '1969', '1970'],
  correct_index: 1,
  explanation: 'O Apollo 11 pousou a 20 de julho de 1969.',
}

const questionId = '11111111-1111-4111-8111-111111111111'
const relicId = '22222222-2222-4222-8222-222222222222'

const quizRow = {
  id: questionId,
  relic_id: relicId,
  position: 0,
  question: validQuestion.question,
  options: validQuestion.options,
  correct_index: 1,
  explanation: validQuestion.explanation,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} as unknown as QuizRow

const relicRow = {
  id: relicId,
  slug: 'quiz-test',
  name: 'Quiz Test',
  mission: 'Test',
  summary: 'Resumo',
  story_text: 'História',
  status: 'active',
  location: 'mars',
  published: true,
  cover_media_id: null,
  alt: 'Teste',
  ratio: '16 / 9',
} as unknown as RelicRow

describe('quiz input schema (BE-13)', () => {
  it('accepts a valid question and trims its text', () => {
    const parsed = quizQuestionInputSchema.parse({
      ...validQuestion,
      question: '  Em que ano?  ',
      options: ['  1968  ', '1969'],
      correct_index: 1,
    })
    expect(parsed.question).toBe('Em que ano?')
    expect(parsed.options).toEqual(['1968', '1969'])
  })

  it('rejects fewer than two or more than five options', () => {
    expect(quizQuestionInputSchema.safeParse({ ...validQuestion, options: ['1969'] }).success).toBe(false)
    expect(quizQuestionInputSchema.safeParse({
      ...validQuestion,
      options: ['a', 'b', 'c', 'd', 'e', 'f'],
      correct_index: 0,
    }).success).toBe(false)
  })

  it('rejects an answer index outside the options', () => {
    const parsed = quizQuestionInputSchema.safeParse({ ...validQuestion, correct_index: 3 })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['correct_index'])
    }
  })

  it('rejects empty questions and empty options', () => {
    expect(quizQuestionInputSchema.safeParse({ ...validQuestion, question: '   ' }).success).toBe(false)
    expect(quizQuestionInputSchema.safeParse({ ...validQuestion, options: ['1968', '  '] }).success).toBe(false)
  })

  it('accepts partial patches for one field at a time', () => {
    expect(quizQuestionPatchSchema.parse({ explanation: 'Nova explicação' })).toEqual({ explanation: 'Nova explicação' })
    expect(quizQuestionPatchSchema.parse({ options: ['A', 'B'] })).toEqual({ options: ['A', 'B'] })
  })

  it('requires UUIDs and a non-empty list for reordering', () => {
    expect(quizOrderSchema.safeParse({ ids: [questionId] }).success).toBe(true)
    expect(quizOrderSchema.safeParse({ ids: [] }).success).toBe(false)
    expect(quizOrderSchema.safeParse({ ids: ['not-a-uuid'] }).success).toBe(false)
  })
})

describe('quiz DTO (BE-13)', () => {
  it('hides the correct answer by default', () => {
    const dto = quizRowToDto(quizRow)
    expect(dto.correct_index).toBeUndefined()
    expect(dto.question).toBe(validQuestion.question)
    expect(dto.options).toEqual(validQuestion.options)
  })

  it('includes answers when explicitly requested by the admin', () => {
    expect(quizRowToDto(quizRow, true).correct_index).toBe(1)
  })

  it('parses options stored as a JSON string', () => {
    const dto = quizRowToDto({ ...quizRow, options: '["A","B"]' } as unknown as QuizRow)
    expect(dto.options).toEqual(['A', 'B'])
  })

  it('keeps correct_index out of the public relic payload', () => {
    const publicRelic = mapDbToRelic(relicRow, [], [], {}, [quizRow])
    expect(publicRelic.quiz).toHaveLength(1)
    expect(publicRelic.quiz?.[0].correct_index).toBeUndefined()

    const adminRelic = mapDbToRelic(relicRow, [], [], { includeQuizAnswers: true }, [quizRow])
    expect(adminRelic.quiz?.[0].correct_index).toBe(1)
  })
})
