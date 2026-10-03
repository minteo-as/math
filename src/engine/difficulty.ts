/**
 * Hvor svær er en bane? Bruges til at sortere banerne inden for et niveau fra let til svær.
 *
 *  - startpunkter: ligninger, hvor der kun mangler ét tal fra start (flere = lettere at komme i gang)
 *  - runder:       hvor mange runder løsningen tager, når man hver gang regner alle de
 *                  ligninger ud, der kun mangler ét tal
 *  - gæt:          hvor mange gange man går i stå og må bruge brikkerne til at ræsonnere
 *  - cifre:        hvor store tallene er (gennemsnitligt antal cifre pr. tal; udtryk tæller efter led)
 */
import { tokenText } from './fraction'
import { isExpr, termCount, type Token } from './value'
import { cellKey, type CellKey, type Puzzle } from './types'

export interface Difficulty {
  entry: number
  rounds: number
  guesses: number
  digits: number
  score: number
}

/** Hvor "stort" et tal eller udtryk er at regne med: antal cifre (3/4 → 2, 0,25 → 2, −12 → 2). */
function size(t: Token): number {
  if (isExpr(t)) return 2 * termCount(t.c)
  return Math.max(1, tokenText(t).replace(/\D/g, '').replace(/^0+/, '').length)
}

export function difficulty(puzzle: Puzzle): Difficulty {
  const known = new Set<CellKey>(puzzle.cells.filter((c) => c.kind === 'given').map((c) => cellKey(c.r, c.c)))
  const missing = (nums: CellKey[]) => nums.filter((k) => !known.has(k)).length
  const entry = puzzle.equations.filter((e) => missing(e.nums) === 1).length

  let rounds = 0
  let guesses = 0
  while (puzzle.equations.some((e) => missing(e.nums) > 0)) {
    const ready = puzzle.equations.filter((e) => missing(e.nums) === 1)
    if (ready.length > 0) {
      rounds++
      for (const e of ready) e.nums.forEach((k) => known.add(k))
      continue
    }
    // I stå: tag den ligning, der mangler færrest tal, og find dem ud fra brikkerne.
    guesses++
    const open = puzzle.equations.filter((e) => missing(e.nums) > 0)
    const easiest = open.reduce((a, b) => (missing(b.nums) < missing(a.nums) ? b : a))
    easiest.nums.forEach((k) => known.add(k))
  }

  const values: Token[] = [
    ...puzzle.cells.flatMap((c) => (c.kind === 'given' ? [c.value] : [])),
    ...Object.values(puzzle.solutions[0]).map((i) => puzzle.tiles[i]),
  ]
  const digits = values.reduce((s, t) => s + size(t), 0) / values.length

  return { entry, rounds, guesses, digits, score: rounds + 2 * guesses - entry + digits }
}
