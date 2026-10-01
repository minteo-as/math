import type { Form, Op } from './fraction'
import type { Token } from './value'

/** Nøgle for et felt i gitteret: "række,kolonne". */
export type CellKey = string

export function cellKey(r: number, c: number): CellKey {
  return `${r},${c}`
}

export type PuzzleCell =
  | { r: number; c: number; kind: 'given'; value: Token }
  /** `form`: den skriveform, brikken i feltet skal have (kun på decimal- og procentniveauer). */
  | { r: number; c: number; kind: 'blank'; form?: Form }
  | { r: number; c: number; kind: 'op'; op: Op }
  | { r: number; c: number; kind: 'eq' }

/** En ligning a ∘ b = c. `nums` er felterne for a, b og c. `cells` er alle 5 felter. */
export interface Equation {
  op: Op
  nums: [CellKey, CellKey, CellKey]
  cells: CellKey[]
}

export type MisconceptionKind =
  | 'add-across'
  | 'sub-across'
  | 'same-den-add'
  | 'numerator-not-expanded'
  | 'wrong-op'
  | 'mul-whole-both'
  | 'mul-cross'
  | 'div-no-flip'
  | 'div-flip-first'
  | 'mixed-sub-parts'
  | 'mixed-add-whole'
  | 'sign'
  | 'not-reduced'
  | 'improper'
  | 'as-percent'
  | 'as-decimal'
  | 'dec-align'
  | 'dec-comma'
  | 'pct-add'
  | 'pct-divide'
  | 'pct-no-100'
  | 'pct-flip'
  | 'pct-mul-instead'
  | 'alg-add-exponents'
  | 'alg-unlike'
  | 'alg-minus-paren'
  | 'alg-mul-degree'
  | 'alg-mul-add-coef'
  | 'alg-distribute-first'
  | 'alg-foil-cross'
  | 'alg-conj-sign'
  | 'alg-div-degree'
  | 'alg-divide-first'
  | 'int-carry'
  | 'int-borrow'
  | 'int-table'
  | 'int-div-table'
  | 'int-neg-add'
  | 'int-neg-sub'
  | 'int-minus-neg'
  | 'int-sign-mul'

/** En fælde-brik: svaret man får ved en typisk fejl i en bestemt ligning. */
export interface Trap {
  tile: number
  /** Indeks i puzzle.equations for den ligning, hvor fejlen typisk sker. */
  equation: number
  cell: CellKey
  kind: MisconceptionKind
}

export interface Puzzle {
  /** Fx "3-07" = niveau 3, bane 7, eller "P2-07". */
  id: string
  /** Niveau-kode, se LevelInfo.code. */
  level: string
  index: number
  rows: number
  cols: number
  cells: PuzzleCell[]
  equations: Equation[]
  /** Brikkerne i bunken (rigtige brikker + fælder), i den rækkefølge de vises. */
  tiles: Token[]
  /** Alle gyldige løsninger: felt -> brik-indeks. Normalt præcis én. */
  solutions: Record<CellKey, number>[]
  traps: Trap[]
}

export interface PuzzleFile {
  version: number
  puzzles: Puzzle[]
}
