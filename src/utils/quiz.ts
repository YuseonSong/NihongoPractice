import type { KanaCharacter } from '../types'

export function makeOptions(items: KanaCharacter[], answer: KanaCharacter, size = 4) {
  const others = items.filter((item) => item.char !== answer.char).sort(() => Math.random() - 0.5).slice(0, size - 1)
  return [...others, answer].sort(() => Math.random() - 0.5)
}
