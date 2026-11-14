#!/usr/bin/env node
/**
 * Generates narration MP3s with Edge TTS (free, no API key) and wires them
 * into `data/relics.json`.
 *
 * Requirements:
 *   python3 -m venv .venv-tts
 *   .venv-tts/bin/pip install edge-tts
 *
 * Usage:
 *   EDGE_TTS_BIN=.venv-tts/bin/edge-tts node scripts/generate-narration.mjs
 *   ... --force          # regenerate existing files
 *   ... --check          # fail if a file or URL is missing (no generation)
 *
 * Env:
 *   EDGE_TTS_BIN    path to the edge-tts binary (default: edge-tts)
 *   EDGE_TTS_VOICE  voice (default: pt-PT-RaquelNeural)
 *   EDGE_TTS_RATE   optional rate, e.g. -5%
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const datasetPath = join(root, 'data', 'relics.json')
const outputDir = join(root, 'public', 'media', 'narration')
const edgeTts = process.env.EDGE_TTS_BIN || 'edge-tts'
const voice = process.env.EDGE_TTS_VOICE || 'pt-PT-RaquelNeural'
const rate = process.env.EDGE_TTS_RATE || ''
const force = process.argv.includes('--force')
const check = process.argv.includes('--check')

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'))
if (!Array.isArray(dataset.relics) || dataset.relics.length === 0) {
  console.error('narration: data/relics.json must contain a non-empty relics array')
  process.exit(1)
}

mkdirSync(outputDir, { recursive: true })

function expectedFiles(relic) {
  const files = [{ file: `${relic.slug}-intro.mp3`, text: relic.story_text.trim() }]
  relic.media.forEach((media, index) => {
    files.push({
      file: `${relic.slug}-scene-${index + 1}.mp3`,
      text: media.caption.trim(),
    })
  })
  return files
}

function relative(file) {
  return `/media/narration/${file}`
}

let generated = 0
let skipped = 0
let missing = 0
let totalBytes = 0

for (const relic of dataset.relics) {
  const files = expectedFiles(relic)
  relic.intro_audio_url = relative(files[0].file)
  relic.media.forEach((media, index) => {
    media.audio_url = relative(files[index + 1].file)
  })

  for (const item of files) {
    const target = join(outputDir, item.file)
    const exists = existsSync(target)
    const size = exists ? statSync(target).size : 0
    if (exists && size > 1000) {
      totalBytes += size
      if (!force) {
        skipped += 1
        continue
      }
    }

    if (check) {
      missing += 1
      console.error(`narration: missing or empty ${item.file}`)
      continue
    }

    if (!item.text) {
      console.error(`narration: ${relic.slug}/${item.file} has no text`)
      process.exit(1)
    }

    const args = ['--voice', voice, '--text', item.text, '--write-media', target]
    if (rate) args.push(`--rate=${rate}`)

    const result = spawnSync(edgeTts, args, { encoding: 'utf8' })
    if (result.error) {
      console.error(`narration: could not run ${edgeTts}: ${result.error.message}`)
      process.exit(1)
    }
    if (result.status !== 0) {
      console.error(result.stderr || result.stdout || `edge-tts exited ${result.status}`)
      process.exit(1)
    }
    if (!existsSync(target) || statSync(target).size <= 1000) {
      console.error(`narration: ${edgeTts} did not write ${item.file}`)
      process.exit(1)
    }

    generated += 1
    totalBytes += statSync(target).size
  }
}

if (check) {
  if (missing > 0) {
    console.error(`narration: ${missing} missing files. Run the generator.`)
    process.exit(1)
  }
  console.log(`narration: ${dataset.relics.length} relics, all files present (${(totalBytes / 1024 / 1024).toFixed(1)} MB).`)
  process.exit(0)
}

writeFileSync(datasetPath, JSON.stringify(dataset, null, 2) + '\n')
console.log(
  `narration: ${generated} generated, ${skipped} skipped, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total (voice: ${voice}).`,
)

const seed = spawnSync(process.execPath, ['scripts/generate-seed.mjs'], { cwd: root, stdio: 'inherit' })
if (seed.status !== 0) process.exit(seed.status ?? 1)
