export interface NarrationWord {
  text: string
  start: number
  end: number
}

export function splitNarrationWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/**
 * Splits the caption into words with proportional timings.
 *
 * The API exposes one audio file per step, not word timestamps, so the time is
 * distributed by word length (longer words take longer). Subtitles therefore
 * advance word by word at the same pace as the voice.
 */
export function buildWordTimings(text: string, duration: number): NarrationWord[] {
  const words = splitNarrationWords(text)
  if (words.length === 0) return []
  if (!Number.isFinite(duration) || duration <= 0) {
    return words.map(word => ({ text: word, start: 0, end: 0 }))
  }

  const weights = words.map(word => Math.max(1, word.replace(/[^\p{L}\p{N}]/gu, '').length))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  let cursor = 0
  return words.map((word, index) => {
    const start = cursor
    const span = (weights[index]! / total) * duration
    cursor += span
    return { text: word, start, end: index === words.length - 1 ? duration : cursor }
  })
}

/** Index of the word being spoken at `time`; -1 before the first word. */
export function wordIndexAt(timings: NarrationWord[], time: number): number {
  let index = -1
  for (const [position, word] of timings.entries()) {
    if (time < word.start) break
    index = position
  }
  return index
}

/** Word index for a `SpeechSynthesis` `charIndex` boundary. */
export function wordIndexAtChar(text: string, charIndex: number): number {
  if (charIndex <= 0) return 0
  const before = text.slice(0, charIndex)
  const words = before.match(/\S+/g) ?? []
  const midWord = before.length > 0 && !/\s$/.test(before)
  return Math.max(0, midWord ? words.length - 1 : words.length)
}
