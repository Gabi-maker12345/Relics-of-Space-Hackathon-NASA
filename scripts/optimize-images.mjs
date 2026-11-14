#!/usr/bin/env node
/**
 * Gera variantes WebP responsivas das imagens de `public/images/relics`.
 *
 * A app usa `srcset` com 480/960/1440 px e os cartões WebGL usam a variante de
 * 960 px. As variantes são commitadas e o `media:upload` envia-as para o bucket.
 *
 * Uso:
 *   node scripts/optimize-images.mjs           # gera/atualiza
 *   node scripts/optimize-images.mjs --check   # falha se faltar alguma
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dir = join(root, 'public', 'images', 'relics')
const widths = [480, 960, 1440]
const sources = readdirSync(dir)
  .filter(file => /\.(jpe?g|png)$/i.test(file))
  .sort()

const hasMagick = (() => {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
})()

const command = hasMagick ? 'magick' : 'convert'

function variantName(file, width) {
  const ext = extname(file)
  return `${file.slice(0, -ext.length)}-${width}.webp`
}

function generate(file, width) {
  const output = join(dir, variantName(file, width))
  execFileSync(command, [
    join(dir, file),
    '-auto-orient',
    '-strip',
    '-resize',
    `${width}x>`,
    '-quality',
    '78',
    output,
  ])
  return output
}

const check = process.argv.includes('--check')
let missing = 0
let total = 0

for (const file of sources) {
  for (const width of widths) {
    const output = join(dir, variantName(file, width))
    total += 1
    if (check) {
      if (!existsSync(output)) {
        console.error(`images: falta ${variantName(file, width)}`)
        missing += 1
      }
      continue
    }
    generate(file, width)
  }
}

if (check) {
  if (missing > 0) {
    console.error(`images: ${missing}/${total} variantes em falta. Corre npm run images:optimize.`)
    process.exit(1)
  }
  console.log(`images: ${total} variantes WebP presentes.`)
}
else {
  const bytes = widths.reduce((sum, width) => {
    return sum + sources.reduce((acc, file) => {
      const output = join(dir, variantName(file, width))
      return acc + (existsSync(output) ? statSync(output).size : 0)
    }, 0)
  }, 0)
  console.log(`images: ${sources.length} originais, ${total} variantes WebP (${(bytes / 1024 / 1024).toFixed(2)} MB).`)
}
