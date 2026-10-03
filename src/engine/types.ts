import type { Form, Op } from './fraction'
import type { ExprToken, StepToken, Tile, Token } from './value'

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
  | 'lig-sign-op'
  | 'lig-move-sign'
  | 'lig-sub-coef'
  | 'lig-sub-denom'
  | 'lig-mul-instead'
  | 'lig-div-instead'
  | 'lig-one-side'
  | 'lig-x-sign'

/** En fælde-brik: svaret man får ved en typisk fejl i en bestemt ligning. */
export interface Trap {
  tile: number
  /** Indeks i puzzle.equations for den ligning, hvor fejlen typisk sker. */
  equation: number
  cell: CellKey
  kind: MisconceptionKind
}

export interface Puzzle {
  /** Krydsbane (feltet mangler i data – kun til at skelne fra ligningstrapper i kode). */
  kind?: 'cross'
  /** Fx "3-07" = niveau 3, bane 7, eller "P2-07". */
  id: string
  /**
   * Id'et i den rækkefølge, generatoren lavede banerne (før de blev sorteret efter sværhedsgrad).
   * Bruges til at flytte gemte stjerner fra før version 0.5 over på de rigtige baner.
   */
  formerId?: string
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

// ---------- Ligninger: ligningstrappen ----------

/** Et felt i trappen: givet på forhånd eller tomt (skal udfyldes med en brik). */
export type LadderSlot<T extends Tile = Tile> = { kind: 'given'; value: T } | { kind: 'blank' }

/**
 * Hvorfor trinnet gøres – bruges i hints:
 *  - konstant:    fjern et tal, der er lagt til eller trukket fra x (x + 5 → −5)
 *  - koefficient: x er ganget med et tal (3x → : 3)
 *  - naevner:     x er divideret med et tal (x/3 → · 3)
 *  - xled:        x på begge sider – fjern x-leddet på højre side (−2x)
 *  - parentes:    hele parentesen er ganget med et tal (2(x + 3) → : 2)
 */
export type LadderStepWhy = 'konstant' | 'koefficient' | 'naevner' | 'xled' | 'parentes'

/**
 * En ligning, der løses trin for trin. Hver række er den samme ligning, bare enklere;
 * mellem rækkerne står operationen, der gøres på begge sider.
 * Feltnøgler: "L0", "R0" (venstre/højre side i række 0), "S0" (trinnet mellem række 0 og 1) …
 */
export interface LadderPuzzle {
  kind: 'ladder'
  id: string
  formerId?: string
  index: number
  level: string
  rows: { left: LadderSlot<ExprToken>; right: LadderSlot<ExprToken> }[]
  steps: { slot: LadderSlot<StepToken>; why: LadderStepWhy }[]
  tiles: (ExprToken | StepToken)[]
  /** Felt → brik-indeks. */
  solution: Record<CellKey, number>
  traps: { tile: number; step: number; cell: CellKey; kind: MisconceptionKind }[]
  /** Løsningen (x-værdien). */
  x: number
}

export interface PuzzleFile {
  version: number
  puzzles: Puzzle[]
  ladders: LadderPuzzle[]
}
