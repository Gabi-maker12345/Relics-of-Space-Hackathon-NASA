import { z } from 'zod'

/**
 * Base language. The database columns hold Portuguese content, so a missing
 * translation always falls back to them.
 */
export const DEFAULT_LANG = 'pt'

/** Matches `en`, `pt-BR`, `en-US`, … Lowercase is enforced before validation. */
export const LANG_PATTERN = /^[a-z]{2}(-[a-z]{2})?$/

export const langSchema = z.string()
  .trim()
  .toLowerCase()
  .regex(LANG_PATTERN, 'Código de idioma inválido (ex: en, pt, en-US).')

/**
 * Normalises an untrusted language value from a query string.
 * Invalid or unknown values fall back to Portuguese instead of failing, which
 * is what the public endpoints promise (BE-12).
 */
export function normalizeLang(value: unknown, fallback = DEFAULT_LANG): string {
  if (typeof value !== 'string') return fallback
  const lang = value.trim().toLowerCase()
  return LANG_PATTERN.test(lang) ? lang : fallback
}
