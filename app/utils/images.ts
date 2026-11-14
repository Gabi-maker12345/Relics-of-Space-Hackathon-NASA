/**
 * Variantes WebP das imagens do seed (480/960/1440), geradas por
 * `npm run images:optimize` e enviadas para o bucket por `media:upload`.
 *
 * Só se aplicam às imagens do seed (`/images/relics/`): uploads do admin e
 * imagens externas da NASA não têm variantes e ficam com o URL original.
 */
export const IMAGE_WIDTHS = [480, 960, 1440] as const

function isSeedImage(url: string | null | undefined): url is string {
  if (!url || url.startsWith('data:')) return false
  if (!url.includes('/images/relics/')) return false
  return /\.(?:jpe?g|png)(?:[?#].*)?$/i.test(url)
}

/** `/images/relics/spirit-1.jpg` → `/images/relics/spirit-1-960.webp`. */
export function imageVariant(url: string, width: number = 960): string {
  if (!isSeedImage(url)) return url
  const clean = url.split(/[?#]/)[0] ?? url
  const suffix = url.slice(clean.length)
  return `${clean.replace(/\.(?:jpe?g|png)$/i, '')}-${width}.webp${suffix}`
}

/** `srcset` com as três larguras; `undefined` para imagens sem variantes. */
export function imageSrcset(url: string, widths: readonly number[] = IMAGE_WIDTHS): string | undefined {
  if (!isSeedImage(url)) return undefined
  return widths.map(width => `${imageVariant(url, width)} ${width}w`).join(', ')
}
