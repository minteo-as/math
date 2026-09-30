import { apply, equals, frac, isReduced, token, type Form, type Frac, type NumToken } from './fraction'
import type { LevelInfo } from './levels'
import type { CellKey, Equation, MisconceptionKind, Puzzle, PuzzleCell } from './types'
import { cellKey } from './types'

/** Brættet: hvilken brik (indeks i puzzle.tiles) der ligger i hvert tomt felt. */
export type Board = Record<CellKey, number | null>

export function tokenValue(t: NumToken): Frac {
  return frac(t.n, t.d)
}

export function tokenKey(t: NumToken): string {
  return `${t.n}/${t.d}/${t.form}`
}

export type FormIssue = 'not-reduced' | 'improper' | 'as-percent' | 'as-decimal'

/**
 * Er brikken skrevet på den form, feltet og niveauet forventer?
 * `expected` er feltets krævede form (kun sat på decimal- og procentniveauer).
 * Returnerer grunden, hvis ikke.
 */
export function formIssue(t: NumToken, level: LevelInfo, expected?: Form): FormIssue | null {
  if (expected === 'dec' || expected === 'pct') {
    if (t.form === expected) return null
    return expected === 'pct' ? 'as-percent' : 'as-decimal'
  }
  if (!isReduced(t)) return 'not-reduced'
  const canonical = token(t, level.form === 'mixed' ? 'mixed' : 'frac')
  if (canonical.form !== t.form) return 'improper'
  return null
}

/** Den skriveform, et tomt felt kræver (undefined = niveauets almindelige regler). */
export function expectedForm(cell: PuzzleCell | undefined): Form | undefined {
  return cell?.kind === 'blank' ? cell.form : undefined
}

export function cellMap(puzzle: Puzzle): Map<CellKey, PuzzleCell> {
  return new Map(puzzle.cells.map((c) => [cellKey(c.r, c.c), c]))
}

export function blankKeys(puzzle: Puzzle): CellKey[] {
  return puzzle.cells.filter((c) => c.kind === 'blank').map((c) => cellKey(c.r, c.c))
}

export type EquationStatus = 'incomplete' | 'ok' | 'wrong'

export interface EquationResult {
  status: EquationStatus
  /** Brikker med rigtig værdi, men forkert skriveform (uforkortet / ikke blandet tal). */
  formIssues: { cell: CellKey; kind: FormIssue }[]
  /** Fælde-brikker lagt i den ligning, de hører til. */
  trapHits: { cell: CellKey; kind: MisconceptionKind }[]
}

export interface BoardResult {
  equations: EquationResult[]
  complete: boolean
  solved: boolean
  wrongCount: number
}

function valueAt(key: CellKey, cells: Map<CellKey, PuzzleCell>, board: Board, puzzle: Puzzle): NumToken | null {
  const cell = cells.get(key)
  if (!cell) return null
  if (cell.kind === 'given') return cell.value
  if (cell.kind === 'blank') {
    const tile = board[key]
    return tile === null || tile === undefined ? null : puzzle.tiles[tile]
  }
  return null
}

export function evaluateEquation(
  eq: Equation,
  eqIndex: number,
  puzzle: Puzzle,
  board: Board,
  level: LevelInfo,
  cells = cellMap(puzzle),
): EquationResult {
  const vals = eq.nums.map((k) => valueAt(k, cells, board, puzzle))
  const result: EquationResult = { status: 'incomplete', formIssues: [], trapHits: [] }
  if (vals.some((v) => v === null)) return result
  const [a, b, c] = vals as NumToken[]

  let ok: boolean
  try {
    ok = equals(apply(eq.op, tokenValue(a), tokenValue(b)), tokenValue(c))
  } catch {
    ok = false // fx division med 0
  }

  // Skriveform tjekkes kun for de brikker, eleven selv har lagt.
  for (const key of eq.nums) {
    const cell = cells.get(key)
    const tile = board[key]
    if (cell?.kind !== 'blank' || tile === null || tile === undefined) continue
    const issue = formIssue(puzzle.tiles[tile], level, expectedForm(cell))
    if (issue) result.formIssues.push({ cell: key, kind: issue })
  }
  if (ok && result.formIssues.length > 0 && level.reduce === 'required') ok = false

  if (!ok) {
    for (const trap of puzzle.traps) {
      const tile = board[trap.cell]
      if (trap.equation !== eqIndex || tile === null || tile === undefined) continue
      // Brikker med samme påskrift er ens – sammenlign påskrift, ikke indeks.
      if (tokenKey(puzzle.tiles[tile]) === tokenKey(puzzle.tiles[trap.tile])) {
        result.trapHits.push({ cell: trap.cell, kind: trap.kind })
      }
    }
  }

  result.status = ok ? 'ok' : 'wrong'
  return result
}

export function evaluateBoard(puzzle: Puzzle, board: Board, level: LevelInfo): BoardResult {
  const cells = cellMap(puzzle)
  const equations = puzzle.equations.map((eq, i) => evaluateEquation(eq, i, puzzle, board, level, cells))
  const complete = blankKeys(puzzle).every((k) => board[k] !== null && board[k] !== undefined)
  const wrongCount = equations.filter((e) => e.status === 'wrong').length
  return {
    equations,
    complete,
    solved: complete && equations.every((e) => e.status === 'ok'),
    wrongCount,
  }
}
