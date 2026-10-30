/**
 * Util de texto para o engine GL — reveal por linha, "slot machine" nos dígitos
 * e segmentos sublinhados (markup `[texto]`) como a desc do card no original.
 * Desenha em CanvasTexture 1:1 com o CSS computado do elemento-fonte.
 */
export const LINE_WINDOW_OVER = 1.35

export type FontSpec = {
  family: string
  weight: string
  sizePx: number
  letterSpacingPx: number
  lineHeightPx: number
  alignCss: 'left' | 'center'
  color: string
  textTransform: string
  dpr: number
}

export type DigitEntry = { target: number; roll: number }

export type TextUnit = { text: string; under: boolean }
export type TextLine = { units: TextUnit[] }

type PlaneInput = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  lines: TextLine[]
  fontSpec: FontSpec
  reveal: number[] | null
  digits: Map<number, DigitEntry>
}

function fontOf(spec: FontSpec): string {
  return `${spec.weight} ${Math.max(1, spec.sizePx * spec.dpr)}px ${spec.family}`
}

function windowHeightPx(spec: FontSpec): number {
  return spec.lineHeightPx * spec.dpr
}

/** Desenha todas as linhas (reveal 0..1 por linha) + reels dos dígitos + underlines. */
export function drawTextPlane(input: PlaneInput): void {
  const spec = input.fontSpec
  const context = input.context
  context.font = fontOf(spec)
  context.letterSpacing = `${spec.letterSpacingPx * spec.dpr}px`
  context.fillStyle = spec.color
  context.textBaseline = 'top'
  context.clearRect(0, 0, input.canvas.width, input.canvas.height)

  const win = windowHeightPx(spec)
  // labels minúsculos (1rem): a SDF do original mantém hastes cheias; no canvas
  // um traço-fio de 0.4px de dispositivo repõe a cobertura (brilho) sem engordar
  const hairline = spec.sizePx < 12 ? 0.4 * spec.dpr : 0
  if (hairline > 0) {
    context.strokeStyle = spec.color
    context.lineWidth = hairline
  }
  let globalIndex = 0
  for (let lineIndex = 0; lineIndex < input.lines.length; lineIndex += 1) {
    const line = input.lines[lineIndex]
    const bandTop = lineIndex * win
    const revealValue = input.reveal ? (input.reveal[lineIndex] ?? 1) : 1
    const slidePx = (1 - revealValue) * win * LINE_WINDOW_OVER
    const flat = line.units.map(u => u.text).join(' ')
    const lineWidth = context.measureText(flat).width
    const startX = spec.alignCss === 'center' ? (input.canvas.width - lineWidth) / 2 : 0

    context.save()
    context.beginPath()
    context.rect(0, bandTop, input.canvas.width, win)
    context.clip()

    // faixas de underline por índice de caractere na string "flat"
    const underRanges: { start: number; end: number }[] = []
    let unitOffset = 0
    for (const unit of line.units) {
      if (unit.under) underRanges.push({ start: unitOffset, end: unitOffset + unit.text.length })
      unitOffset += unit.text.length + 1 // + espaço
    }

    let cursorX = startX
    const baseY = bandTop + slidePx
    for (let i = 0; i < flat.length; i += 1) {
      const char = flat.charAt(i)
      const digit = input.digits.get(globalIndex + i)
      if (digit !== undefined) {
        for (let glyphIndex = digit.target - 10; glyphIndex <= digit.target; glyphIndex += 1) {
          const shownDigit = (((glyphIndex % 10) + 10) % 10)
          const yPx = baseY + (glyphIndex - digit.target + 10 * digit.roll) * win
          if (yPx < baseY - win * 0.5 || yPx > baseY + win * 1.5) continue
          context.fillText(String(shownDigit), cursorX, yPx)
          if (hairline > 0) context.strokeText(String(shownDigit), cursorX, yPx)
        }
        cursorX += context.measureText(String(digit.target)).width
      } else {
        context.fillText(char, cursorX, baseY)
        if (hairline > 0) context.strokeText(char, cursorX, baseY)
        cursorX += context.measureText(char).width
      }
    }

    // underlines (1 device-independent px, na altura da descendente)
    if (underRanges.length > 0) {
      const underY = baseY + spec.sizePx * spec.dpr * 0.98
      const thickness = Math.max(1, spec.dpr * 0.8)
      let x = startX
      let idx = 0
      for (const range of underRanges) {
        while (idx < range.start) {
          x += context.measureText(flat.charAt(idx)).width
          idx += 1
        }
        const startUnder = x
        while (idx < range.end) {
          x += context.measureText(flat.charAt(idx)).width
          idx += 1
        }
        context.fillRect(startUnder, underY, x - startUnder, thickness)
      }
    }
    context.restore()
    globalIndex += flat.length + 1
  }
}

/** Índices globais de dígitos (um entry por dígito) para o slot machine. */
export function collectDigitTargets(lines: TextLine[]): Map<number, DigitEntry> {
  const map = new Map<number, DigitEntry>()
  let global = 0
  for (const line of lines) {
    const flat = line.units.map(u => u.text).join(' ')
    for (let i = 0; i < flat.length; i += 1) {
      const char = flat.charAt(i)
      if (char >= '0' && char <= '9') {
        map.set(global + i, { target: Number.parseInt(char, 10), roll: 1 })
      }
    }
    global += flat.length + 1
  }
  return map
}

function parseUnits(rawText: string): TextUnit[] {
  const units: TextUnit[] = []
  const re = /\[([^\]]+)\]|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(rawText)) !== null) {
    if (m[1] !== undefined) units.push({ text: m[1], under: true })
    else if (m[2] !== undefined) units.push({ text: m[2], under: false })
  }
  return units
}

/** Cria as linhas com wrap equivalente ao DOM e markup `[ ]` de underline. */
export function buildLines(
  context: CanvasRenderingContext2D,
  fontSpec: FontSpec,
  rawText: string,
  maxWidthCss: number,
): TextLine[] {
  context.font = fontOf(fontSpec)
  context.letterSpacing = `${fontSpec.letterSpacingPx * fontSpec.dpr}px`
  const text = fontSpec.textTransform === 'uppercase' ? rawText.toUpperCase() : rawText
  const units = parseUnits(text)
  const lines: TextLine[] = []
  const maxWidth = maxWidthCss * fontSpec.dpr + 1.5
  let current: TextUnit[] = []
  for (const unit of units) {
    const candidate = [...current, unit].map(u => u.text).join(' ')
    if (context.measureText(candidate).width <= maxWidth || current.length === 0) {
      current.push(unit)
    } else {
      lines.push({ units: current })
      current = [unit]
    }
  }
  if (current.length > 0) lines.push({ units: current })
  return lines
}
