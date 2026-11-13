import { describe, expect, it } from 'vitest'
import { DEFAULT_LANG, normalizeLang } from '../server/utils/i18n'
import { relicTranslationInputSchema } from '../server/utils/relicTranslations'

describe('language normalization (BE-12)', () => {
  it('keeps valid codes and lowercases them', () => {
    expect(normalizeLang('en')).toBe('en')
    expect(normalizeLang('EN')).toBe('en')
    expect(normalizeLang('pt-BR')).toBe('pt-br')
    expect(normalizeLang(' en-us ')).toBe('en-us')
  })

  it('falls back to Portuguese for missing, invalid or non-string values', () => {
    expect(normalizeLang(undefined)).toBe(DEFAULT_LANG)
    expect(normalizeLang('')).toBe(DEFAULT_LANG)
    expect(normalizeLang('english')).toBe(DEFAULT_LANG)
    expect(normalizeLang('e')).toBe(DEFAULT_LANG)
    expect(normalizeLang(['en'])).toBe(DEFAULT_LANG)
  })
})

describe('translation input schema (BE-12)', () => {
  it('accepts a partial payload (one tab at a time)', () => {
    const parsed = relicTranslationInputSchema.parse({ name: 'Apollo Lunar Module' })
    expect(parsed.name).toBe('Apollo Lunar Module')
  })

  it('accepts media and quiz batches', () => {
    const parsed = relicTranslationInputSchema.parse({
      summary: 'Six landings.',
      media: [{
        media_id: '11111111-1111-4111-8111-111111111111',
        caption: 'Descent stage in English',
        audio_url: '/media/en-scene.mp3',
      }],
      quiz: [{
        question_id: '22222222-2222-4222-8222-222222222222',
        question: 'Which year?',
        options: ['1969', '1970'],
        explanation: 'Apollo 11 landed in 1969.',
      }],
    })

    expect(parsed.media).toHaveLength(1)
    expect(parsed.quiz?.[0].options).toEqual(['1969', '1970'])
  })

  it('rejects ids that are not UUIDs', () => {
    const parsed = relicTranslationInputSchema.safeParse({
      media: [{ media_id: 'not-a-uuid', caption: 'x' }],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects quiz option lists outside 2..5', () => {
    const parsed = relicTranslationInputSchema.safeParse({
      quiz: [{
        question_id: '22222222-2222-4222-8222-222222222222',
        options: ['only one'],
      }],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects unsafe asset URLs but accepts site-relative paths', () => {
    expect(relicTranslationInputSchema.safeParse({ intro_audio_url: 'javascript:alert(1)' }).success).toBe(false)
    expect(relicTranslationInputSchema.safeParse({ intro_audio_url: '/media/en-intro.mp3' }).success).toBe(true)
    expect(relicTranslationInputSchema.safeParse({ intro_audio_url: null }).success).toBe(true)
  })
})
