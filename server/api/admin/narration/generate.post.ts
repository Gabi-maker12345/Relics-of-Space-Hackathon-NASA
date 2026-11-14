import { randomUUID } from 'node:crypto'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { requireAdmin } from '../../../utils/auth'
import { normalizeRelicId } from '../../../utils/upload'

/**
 * TTS sob demanda (Edge TTS, sem API key) para o botão "Gerar áudio" do admin.
 *
 * Gera um MP3 a partir do texto, guarda no bucket `relic-media` e devolve o URL
 * público. Funciona em Node (Vercel incluído); não precisa de Python.
 */

const VOICE = 'pt-PT-RaquelNeural'
const MAX_TEXT = 4000
const TIMEOUT_MS = 30_000

const AUDIO_PATH = 'relics/narration/audio'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

async function synthesize(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS()
  try {
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(escapeXml(text))

    const chunks: Buffer[] = []
    const { promise, resolve, reject } = Promise.withResolvers<undefined>()
    const timer = setTimeout(() => reject(new Error('timeout a falar com o serviço TTS')), TIMEOUT_MS)
    const finish = (): void => {
      clearTimeout(timer)
      resolve(undefined)
    }
    const fail = (error: Error): void => {
      clearTimeout(timer)
      reject(error)
    }

    audioStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    audioStream.once('end', finish)
    audioStream.once('error', fail)

    await promise
    return Buffer.concat(chunks)
  }
  finally {
    tts.close()
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event).catch(() => ({}))
  const rawText = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!rawText) {
    throw createError({ statusCode: 400, message: 'Escreve o texto antes de gerar o áudio.' })
  }
  if (rawText.length > MAX_TEXT) {
    throw createError({ statusCode: 400, message: `Texto demasiado longo (máximo ${MAX_TEXT} caracteres).` })
  }

  const relicId = normalizeRelicId(body?.relicId)
  if (relicId === null) {
    throw createError({ statusCode: 400, message: 'relicId inválido.' })
  }

  let audio: Buffer
  try {
    audio = await synthesize(rawText)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido'
    throw createError({ statusCode: 502, message: `Falha ao gerar a narração: ${message}` })
  }

  if (audio.length <= 1000) {
    throw createError({ statusCode: 502, message: 'O serviço TTS devolveu áudio vazio.' })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)
  const path = `${AUDIO_PATH}/${relicId}/${randomUUID()}.mp3`
  const { error } = await supabase.storage.from('relic-media').upload(path, audio, {
    contentType: 'audio/mpeg',
    upsert: false,
  })
  if (error) {
    throw createError({ statusCode: 502, message: `Falha no armazenamento: ${error.message}` })
  }

  const { data } = supabase.storage.from('relic-media').getPublicUrl(path)
  return {
    url: data.publicUrl,
    path,
    bytes: audio.length,
    voice: VOICE,
  }
})
