import { createError, defineEventHandler, getRequestIP, readBody, setResponseHeader } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '~/types/database.types'
import { normalizeLang } from '../utils/i18n'
import { findRelic } from '../utils/relicInput'
import { consume } from '../utils/rate-limit'

/**
 * Chat público do arquivo. A IA responde em pt/en sobre uma relíquia publicada.
 * Provider OpenAI-compatível; por omissão usa o Muse Spark do OpenCode Go:
 *   CHAT_AI_API_KEY / CHAT_AI_MODEL / CHAT_AI_BASE_URL
 * (fallback para QUIZ_AI_* / OPENAI_API_KEY)
 */

const MAX_MESSAGES = 16
const MAX_CONTENT = 2000

const bodySchema = z.object({
  lang: z.string().max(12).optional(),
  relicId: z.string().min(1).max(160).optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(MAX_CONTENT),
  })).min(1).max(MAX_MESSAGES),
})

interface ChatContext {
  name: string
  summary: string
  story: string
  facts: string[]
  scenes: string[]
}

/** Carrega o que a IA pode saber: só dados publicados e na língua pedida. */
async function loadContext(
  supabase: SupabaseClient<Database>,
  relicId: string,
  lang: string,
): Promise<ChatContext | null> {
  const relic = await findRelic(supabase, relicId)
  if (!relic || relic.published === false) return null

  const [translationRes, factsRes, mediaRes] = await Promise.all([
    supabase
      .from('relic_translations')
      .select('name, summary, story_text')
      .eq('relic_id', relic.id)
      .eq('lang', lang)
      .maybeSingle(),
    supabase
      .from('relic_facts')
      .select('label, value')
      .eq('relic_id', relic.id)
      .order('position'),
    supabase
      .from('relic_media')
      .select('id, title, kicker, caption')
      .eq('relic_id', relic.id)
      .order('position'),
  ])

  const mediaIds = (mediaRes.data ?? []).map(row => row.id)
  const mediaTranslations = mediaIds.length > 0
    ? await supabase
      .from('media_translations')
      .select('media_id, title, kicker, caption')
      .eq('lang', lang)
      .in('media_id', mediaIds)
    : { data: [] as { media_id: string, title: string | null, kicker: string | null, caption: string | null }[] }

  const translated = new Map((mediaTranslations.data ?? []).map(row => [row.media_id, row]))

  return {
    name: translationRes.data?.name?.trim() || relic.name,
    summary: translationRes.data?.summary?.trim() || relic.summary,
    story: translationRes.data?.story_text?.trim() || relic.story_text,
    facts: (factsRes.data ?? [])
      .map(row => `${row.label}: ${row.value}`)
      .filter(Boolean),
    scenes: (mediaRes.data ?? [])
      .map((row) => {
        const media = translated.get(row.id)
        const caption = media?.caption?.trim() || row.caption?.trim()
        const title = media?.title?.trim() || row.title?.trim()
        return [title, caption].filter(Boolean).join(' — ')
      })
      .filter(Boolean),
  }
}

function buildSystemPrompt(lang: string, relic: ChatContext | null, compact = false): string {
  const language = lang === 'en' ? 'inglês britânico' : 'português europeu'
  const lines = [
    'És o guia do arquivo "Space Relics", um arquivo de máquinas espaciais abandonadas na Lua, em Marte e no espaço profundo.',
    `Responde sempre em ${language}.`,
    'Sê claro, caloroso e específico. Responde em no máximo 3 frases curtas (cerca de 55 palavras). Sem listas, sem markdown, sem emojis.',
    'Usa apenas os dados fornecidos. Se um dado não existir no arquivo, di-lo com naturalidade em vez de inventar.',
  ]

  if (relic) {
    lines.push('', `Relíquia em foco: ${relic.name}`, `Resumo: ${relic.summary}`)
    if (relic.story) lines.push(`História: ${relic.story.slice(0, compact ? 500 : 1400)}`)
    if (relic.facts.length > 0) lines.push(`Ficha técnica: ${relic.facts.join('; ')}`)
    if (relic.scenes.length > 0) lines.push(`Cenas do arquivo: ${relic.scenes.slice(0, compact ? 3 : 6).join(' | ')}`)
  }

  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const quota = consume(`chat:${ip}`, { limit: 20, windowMs: 60_000 })
  if (!quota.allowed) {
    setResponseHeader(event, 'Retry-After', quota.retryAfterSeconds)
    throw createError({
      statusCode: 429,
      message: 'Demasiados pedidos ao chat. Tenta daqui a pouco.',
    })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Pedido inválido.' })
  }

  const apiKey = process.env.CHAT_AI_API_KEY || process.env.QUIZ_AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      message: 'Chat indisponível: configura CHAT_AI_API_KEY no ambiente.',
    })
  }

  const body = parsed.data
  const lang = normalizeLang(body.lang)
  const supabase = serverSupabaseServiceRole<Database>(event)
  const relic = body.relicId ? await loadContext(supabase, body.relicId, lang) : null

  const model = process.env.CHAT_AI_MODEL || process.env.QUIZ_AI_MODEL || 'gpt-4o-mini'
  const baseUrl = (process.env.CHAT_AI_BASE_URL || process.env.QUIZ_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  // O OpenCode Go exige um id de sessão para encaminhar o pedido.
  const sessionId = crypto.randomUUID()
  let diagnostics = ''

  /** Uma chamada ao provider; devolve o texto (ou '' se vier sem conteúdo). */
  async function callProvider(system: string, temperature: number): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45_000)
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'x-opencode-session': sessionId,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            { role: 'system', content: system },
            ...body.messages,
          ],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`provider respondeu ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`)
      }

      const json = (await response.json()) as {
        choices?: { finish_reason?: string, message?: { content?: string, reasoning?: string } }[]
        usage?: unknown
      }
      const content = json.choices?.[0]?.message?.content?.trim() ?? ''
      if (!content) {
        const choice = json.choices?.[0]
        diagnostics = `finish=${choice?.finish_reason ?? '?'} reasoning=${choice?.message?.reasoning?.length ?? 0} usage=${JSON.stringify(json.usage ?? null)}`
      }
      return content
    }
    finally {
      clearTimeout(timer)
    }
  }

  try {
    let reply = await callProvider(buildSystemPrompt(lang, relic), 0.6)
    // O modelo de raciocínio às vezes devolve conteúdo vazio: segunda tentativa
    // com contexto compacto e orçamento de tokens explícito.
    if (!reply) reply = await callProvider(buildSystemPrompt(lang, relic, true), 0.3)
    if (!reply) throw new Error(`resposta vazia ${diagnostics}`)

    return { reply, relic: relic?.name ?? null, lang }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido'
    throw createError({ statusCode: 502, message: `Falha no chat: ${message}` })
  }
})
