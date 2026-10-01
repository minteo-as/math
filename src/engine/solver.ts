import type { Frac, Op } from './fraction'
import { blankKeys, cellMap, expectedForm, formIssue, tokenKey } from './evaluate'
import { constOf, papply, pconst, pequals, pmul, padd, pdiv, psub, tokenPoly, type Poly } from './value'
import type { LevelInfo } from './levels'
import type { CellKey, Puzzle } from './types'

/**
 * Finder den ukendte i a ∘ b = c, når de to andre kendes.
 * `pos` er positionen af den ukendte (0 = a, 1 = b, 2 = c).
 * Returnerer null, hvis det ikke kan lade sig gøre (fx division med 0 eller en division, der ikke går op).
 */
export function solveForPoly(op: Op, pos: 0 | 1 | 2, known: [Poly | null, Poly | null, Poly | null]): Poly | null {
  const [a, b, c] = known
  if (pos === 2) return papply(op, a!, b!)
  if (pos === 0) {
    switch (op) {
      case '+':
        return psub(c!, b!)
      case '-':
        return padd(c!, b!)
      case '*':
      case 'af':
        return pdiv(c!, b!)
      case ':':
        return pmul(c!, b!)
    }
  }
  switch (op) {
    case '+':
      return psub(c!, a!)
    case '-':
      return psub(a!, c!)
    case '*':
    case 'af':
      return pdiv(c!, a!)
    case ':':
      return pdiv(a!, c!)
  }
}

/** Samme som solveForPoly, men for almindelige tal (brøker). */
export function solveFor(op: Op, pos: 0 | 1 | 2, known: [Frac | null, Frac | null, Frac | null]): Frac | null {
  const p = solveForPoly(op, pos, known.map((f) => (f ? pconst(f) : null)) as [Poly | null, Poly | null, Poly | null])
  return p ? constOf(p) : null
}

/**
 * Finder løsninger, hvor alle brikker står på den form, niveauet kræver
 * (forkortet / blandet tal). Stopper, når `limit` løsninger er fundet.
 * Brikker med samme påskrift regnes som ens, så dubletter ikke giver ekstra løsninger.
 */
export function findSolutions(puzzle: Puzzle, level: LevelInfo, limit = 2): Record<CellKey, number>[] {
  const cells = cellMap(puzzle)
  const blanks = blankKeys(puzzle)
  const values = new Map<CellKey, Poly>()
  for (const cell of cells.values()) {
    if (cell.kind === 'given') values.set(`${cell.r},${cell.c}`, tokenPoly(cell.value))
  }
  const usable = puzzle.tiles.map((t, i) => ({ i, key: tokenKey(t), value: tokenPoly(t) }))
  /** Må brikken ligge i feltet? (Kun brikker på den rigtige skriveform tæller som løsning.) */
  const fits = (tile: number, key: CellKey) => formIssue(puzzle.tiles[tile], level, expectedForm(cells.get(key))) === null
  const used = new Set<number>()
  const assignment: Record<CellKey, number> = {}
  const solutions: Record<CellKey, number>[] = []

  const consistent = (): boolean =>
    puzzle.equations.every((eq) => {
      const v = eq.nums.map((k) => values.get(k))
      if (v.some((x) => x === undefined)) return true
      const left = papply(eq.op, v[0]!, v[1]!)
      return left !== null && pequals(left, v[2]!)
    })

  /** Vælg næste felt: helst et, hvor en ligning kun mangler netop det. */
  const nextCell = (): { key: CellKey; forced: Poly | null; impossible?: boolean } | null => {
    for (const eq of puzzle.equations) {
      const missing = eq.nums.filter((k) => !values.has(k))
      if (missing.length !== 1) continue
      const pos = eq.nums.indexOf(missing[0]) as 0 | 1 | 2
      const known = eq.nums.map((k) => values.get(k) ?? null) as [Poly | null, Poly | null, Poly | null]
      const forced = solveForPoly(eq.op, pos, known)
      return { key: missing[0], forced, impossible: forced === null }
    }
    const free = blanks.find((k) => !values.has(k))
    return free ? { key: free, forced: null } : null
  }

  const search = (): void => {
    if (solutions.length >= limit) return
    const next = nextCell()
    if (!next) {
      solutions.push({ ...assignment })
      return
    }
    if (next.impossible) return
    const tried = new Set<string>()
    for (const t of usable) {
      if (used.has(t.i) || tried.has(t.key) || !fits(t.i, next.key)) continue
      if (next.forced && !pequals(next.forced, t.value)) continue
      tried.add(t.key)
      used.add(t.i)
      values.set(next.key, t.value)
      assignment[next.key] = t.i
      if (consistent()) search()
      used.delete(t.i)
      values.delete(next.key)
      delete assignment[next.key]
      if (solutions.length >= limit) return
    }
  }

  search()
  return solutions
}

export interface DeductionStep {
  equation: number
  cell: CellKey
  value: Poly
}

/**
 * Kan banen løses ved hele tiden at finde en ligning, hvor der kun mangler ét tal?
 * Returnerer rækkefølgen af skridt – eller null, hvis man går i stå.
 * `known` er felter, der allerede regnes som kendte (standard: de givne tal).
 * Med `partial` returneres de skridt, der kunne tages, selv om man går i stå.
 */
export function deductionOrder(puzzle: Puzzle, known?: Map<CellKey, Poly>, partial = false): DeductionStep[] | null {
  const cells = cellMap(puzzle)
  const values = new Map<CellKey, Poly>(known ?? [])
  if (!known) {
    for (const cell of cells.values()) {
      if (cell.kind === 'given') values.set(`${cell.r},${cell.c}`, tokenPoly(cell.value))
    }
  }
  const blanks = blankKeys(puzzle)
  const steps: DeductionStep[] = []
  let progress = true
  while (progress && blanks.some((k) => !values.has(k))) {
    progress = false
    for (let i = 0; i < puzzle.equations.length; i++) {
      const eq = puzzle.equations[i]
      const missing = eq.nums.filter((k) => !values.has(k))
      if (missing.length !== 1) continue
      const pos = eq.nums.indexOf(missing[0]) as 0 | 1 | 2
      const kn = eq.nums.map((k) => values.get(k) ?? null) as [Poly | null, Poly | null, Poly | null]
      const value = solveForPoly(eq.op, pos, kn)
      if (!value) return null
      values.set(missing[0], value)
      steps.push({ equation: i, cell: missing[0], value })
      progress = true
      break
    }
  }
  return partial || blanks.every((k) => values.has(k)) ? steps : null
}
