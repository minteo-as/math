import { equals, frac, fracText, isInteger, lcm, OP_SYMBOL, type Frac, type Op } from './fraction'
import { cellMap, tokenValue, type Board } from './evaluate'
import type { LevelInfo } from './levels'
import { deductionOrder } from './solver'
import type { CellKey, Puzzle } from './types'

export interface HintTarget {
  equation: number
  cell: CellKey
  /** true, hvis ligningen kun mangler dette ene tal (ellers skal brikkerne bruges). */
  single: boolean
}

/** De rigtige værdier i alle tal-felter (givne + løsningen). */
export function solutionValues(puzzle: Puzzle): Map<CellKey, Frac> {
  const values = new Map<CellKey, Frac>()
  for (const cell of puzzle.cells) {
    if (cell.kind === 'given') values.set(`${cell.r},${cell.c}`, tokenValue(cell.value))
  }
  for (const [key, tile] of Object.entries(puzzle.solutions[0])) values.set(key, tokenValue(puzzle.tiles[tile]))
  return values
}

/**
 * Hint 1: "Hvor skal jeg starte?"
 * Finder en ligning, hvor der kun mangler ét tal – regnet ud fra de givne tal
 * og de brikker, der allerede ligger rigtigt.
 */
export function findHintTarget(puzzle: Puzzle, board: Board): HintTarget | null {
  const truth = solutionValues(puzzle)
  const cells = cellMap(puzzle)
  const known = new Map<CellKey, Frac>()
  for (const [key, value] of truth) {
    const cell = cells.get(key)!
    if (cell.kind === 'given') known.set(key, value)
    else {
      const tile = board[key]
      if (tile !== null && tile !== undefined && equals(tokenValue(puzzle.tiles[tile]), value)) known.set(key, value)
    }
  }
  const steps = deductionOrder(puzzle, known, true)
  if (steps && steps.length > 0) return { equation: steps[0].equation, cell: steps[0].cell, single: true }

  // Ingen ligning med kun ét ukendt tal: vælg den med færrest ukendte.
  let best: HintTarget | null = null
  let bestMissing = Infinity
  puzzle.equations.forEach((eq, i) => {
    const missing = eq.nums.filter((k) => !known.has(k))
    if (missing.length > 0 && missing.length < bestMissing) {
      bestMissing = missing.length
      best = { equation: i, cell: missing[0], single: missing.length === 1 }
    }
  })
  return best
}

function paren(f: Frac, form: 'frac' | 'mixed' = 'frac'): string {
  return f.n < 0 ? `(${fracText(f, form)})` : fracText(f, form)
}

function num(n: number): string {
  return n < 0 ? `(−${-n})` : String(n)
}

function signed(n: number): string {
  return n < 0 ? `−${-n}` : String(n)
}

/**
 * Hint 2: "Vis mellemregningen" – uden at afsløre selve facit.
 */
export function explainSteps(puzzle: Puzzle, target: HintTarget, level: LevelInfo): string[] {
  const eq = puzzle.equations[target.equation]
  const truth = solutionValues(puzzle)
  const pos = eq.nums.indexOf(target.cell) as 0 | 1 | 2
  const [a, b, c] = eq.nums.map((k) => truth.get(k)!)
  const lines: string[] = []

  if (!target.single) {
    lines.push('Der mangler mere end ét tal i denne ligning.')
    lines.push('Kig på brikkerne: hvilke brikker kan få ligningen til at gå op?')
    return lines
  }

  // Omskriv, så det ukendte tal står alene.
  let op: Op = eq.op
  let p = a
  let q = b
  if (pos !== 2) {
    const inverse: Record<Op, Op> = { '+': '-', '-': '+', '*': ':', ':': '*' }
    if (pos === 0) [op, p, q] = [inverse[eq.op], c, b]
    else if (eq.op === '+' || eq.op === '*') [op, p, q] = [inverse[eq.op], c, a]
    else [op, p, q] = [eq.op, a, c]
    const form = level.mixed ? 'mixed' : 'frac'
    lines.push(`Omskriv, så ? står alene:  ? = ${paren(p, form)} ${OP_SYMBOL[op]} ${paren(q, form)}`)
  }

  if (level.mixed) {
    const mixedOnes = [p, q].filter((f) => Math.abs(f.n) > f.d && !isInteger(f))
    if (mixedOnes.length > 0) {
      lines.push(
        'Omskriv til uægte brøker:  ' + mixedOnes.map((f) => `${fracText(f, 'mixed')} = ${fracText(f)}`).join(',  '),
      )
    }
  }

  switch (op) {
    case '+':
    case '-': {
      const verb = op === '+' ? 'Læg tællerne sammen' : 'Træk tællerne fra hinanden'
      if (p.d === q.d) {
        lines.push(`Nævnerne er ens (${p.d}). ${verb}:  ${num(p.n)} ${OP_SYMBOL[op]} ${num(q.n)}`)
      } else {
        const d = lcm(p.d, q.d)
        const pn = p.n * (d / p.d)
        const qn = q.n * (d / q.d)
        lines.push(`Find fællesnævneren: ${d}`)
        const expand = [p, q]
          .filter((f) => f.d !== d)
          .map((f) => `${fracText(f)} = ${signed(f.n * (d / f.d))}/${d}`)
        lines.push(`Forlæng:  ${expand.join('  og  ')}`)
        lines.push(`${verb}:  ${num(pn)} ${OP_SYMBOL[op]} ${num(qn)}  – nævneren er ${d}`)
      }
      break
    }
    case '*': {
      if (isInteger(p) !== isInteger(q)) {
        const [k, f] = isInteger(p) ? [p.n, q] : [q.n, p]
        lines.push(`Et helt tal ganges kun på tælleren:  ${num(k)} · ${num(f.n)}  – nævneren er stadig ${f.d}`)
      } else {
        lines.push(`Gang tæller med tæller og nævner med nævner:  (${num(p.n)} · ${num(q.n)}) / (${p.d} · ${q.d})`)
      }
      break
    }
    case ':': {
      const flipped = frac(q.d, q.n)
      if (isInteger(q)) lines.push(`${fracText(q)} = ${fracText(q)}/1, så den omvendte brøk er ${fracText(flipped)}`)
      lines.push(`Gang med den omvendte brøk:  ${paren(p)} · ${paren(flipped)}`)
      break
    }
  }

  lines.push(level.mixed ? 'Forkort til sidst – og skriv som blandet tal, hvis tallet er større end 1.' : 'Forkort til sidst, hvis du kan.')
  return lines
}

/**
 * Stjerner efter fejl og hints (intet ur):
 *  ⭐⭐⭐  ingen fejlede tjek og ingen hints
 *  ⭐⭐   højst ét fejlet tjek ELLER ét lille hint
 *  ⭐    banen er løst (altid, hvis "placér en brik" er brugt)
 */
export function starsFor(failedChecks: number, smallHints: number, placeHints: number): 1 | 2 | 3 {
  if (placeHints > 0) return 1
  const penalty = failedChecks + smallHints
  return penalty === 0 ? 3 : penalty === 1 ? 2 : 1
}
