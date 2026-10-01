/**
 * Banegenerator for algebra (niveau A1–A4). Køres på forhånd (npm run generate).
 *
 * Samme fremgangsmåde som for tal (se generator.ts), men felterne indeholder
 * udtryk i x med hele koefficienter og højst grad 2. Alle baner kan løses
 * skridt for skridt: hele tiden en ligning, hvor der kun mangler ét udtryk.
 */
import type { Op } from './fraction'
import { tokenKey } from './evaluate'
import { layoutOf, puzzleSignature, shuffleTiles, type Layout } from './generator'
import { levelInfo, type LevelInfo } from './levels'
import { algebraTrapCandidates } from './algebra'
import { createRng, type Rng } from './rng'
import { deductionOrder, findSolutions, solveForPoly } from './solver'
import { TEMPLATES } from './templates'
import { type CellKey, type Equation, type Puzzle, type PuzzleCell, type Trap } from './types'
import { exprToken, intCoeffs, papply, pequals, poly, termCount, type Poly } from './value'

interface AlgebraGen {
  /** Kun skabeloner med højst 5 kolonner – udtrykkene fylder meget. */
  templates: string[]
  ops: Op[]
  trapCount: number
  /** Niveauets egne typiske fejl – de vælges før andre fælder. */
  priority: Trap['kind'][]
  random(rng: Rng): number[]
  valid(c: number[]): boolean
  puzzleOk(eqs: { op: Op; vals: number[][] }[]): boolean
}

const SMALL = ['pi', 'beam', 'hshape', 'square']

const deg = (c: number[]) => c.length - 1
const hasX = (c: number[]) => c.slice(1).some((k) => k !== 0)
const isMulti = (c: number[]) => termCount(c) > 1
const maxAbs = (c: number[]) => Math.max(...c.map(Math.abs))
const sign = (rng: Rng, pNeg: number) => (rng.next() < pNeg ? -1 : 1)

/** Fælles grænser: ikke 0, højst grad 2, højst 3 led, ikke for store tal. */
function basicValid(c: number[], maxDeg = 2, maxCoef = 40): boolean {
  return c.length > 0 && deg(c) <= maxDeg && termCount(c) <= 3 && maxAbs(c) <= maxCoef
}

const GENERATORS: Record<string, AlgebraGen> = {
  A1: {
    templates: SMALL,
    ops: ['+', '-'],
    trapCount: 2,
    priority: ['alg-add-exponents', 'alg-unlike'],
    random: (rng) => {
      const r = rng.next()
      if (r < 0.45) return [0, sign(rng, 0.15) * rng.int(1, 8)]
      if (r < 0.75) return [sign(rng, 0.3) * rng.int(1, 9), rng.int(1, 6)]
      return [rng.int(1, 12)]
    },
    valid: (c) => basicValid(c, 1, 12),
    // Mindst én ligning med ensartede led og mindst ét svar af typen "x + tal".
    // Ingen minusparenteser – de hører til A3.
    puzzleOk: (eqs) =>
      eqs.some((e) => hasX(e.vals[0]) && hasX(e.vals[1])) &&
      eqs.some((e) => isMulti(e.vals[2])) &&
      !eqs.some((e) => e.op === '-' && isMulti(e.vals[1])),
  },
  A2: {
    templates: SMALL,
    ops: ['*', ':'],
    trapCount: 3,
    priority: ['alg-mul-degree', 'alg-mul-add-coef', 'alg-div-degree'],
    random: (rng) => {
      const d = rng.pick([0, 1, 1, 2])
      const k = sign(rng, 0.15) * rng.int(d === 0 ? 2 : 1, d === 2 ? 6 : 9)
      return [...Array(d).fill(0), k]
    },
    valid: (c) => basicValid(c, 2, 60) && termCount(c) === 1 && !(c.length === 1 && Math.abs(c[0]) === 1),
    puzzleOk: (eqs) => eqs.some((e) => hasX(e.vals[0]) && hasX(e.vals[1])),
  },
  A3: {
    templates: SMALL,
    ops: ['*', '*', '-', '+'],
    trapCount: 3,
    priority: ['alg-distribute-first', 'alg-minus-paren', 'alg-divide-first'],
    random: (rng) => {
      const r = rng.next()
      if (r < 0.3) return [rng.int(2, 6)]
      if (r < 0.5) return [0, rng.int(1, 4)]
      return [sign(rng, 0.4) * rng.int(1, 9), rng.int(1, 3)]
    },
    valid: (c) => basicValid(c),
    // Mindst ét "tal · parentes" og ingen "parentes · parentes" (det er A4).
    puzzleOk: (eqs) =>
      eqs.some((e) => e.op === '*' && isMulti(e.vals[0]) !== isMulti(e.vals[1])) &&
      !eqs.some((e) => e.op === '*' && isMulti(e.vals[0]) && isMulti(e.vals[1])) &&
      (eqs.length === 3 || eqs.some((e) => e.op === '-' && isMulti(e.vals[1]))),
  },
  A4: {
    templates: SMALL,
    ops: ['*', '*', '+', '-'],
    trapCount: 3,
    priority: ['alg-foil-cross', 'alg-conj-sign', 'alg-distribute-first'],
    random: (rng) => {
      const r = rng.next()
      if (r < 0.7) return [sign(rng, 0.5) * rng.int(1, 6), 1]
      if (r < 0.85) return [sign(rng, 0.5) * rng.int(1, 5), 2]
      return [rng.int(2, 5)]
    },
    valid: (c) => basicValid(c),
    // Mindst ét produkt af to parenteser.
    puzzleOk: (eqs) => eqs.some((e) => e.op === '*' && isMulti(e.vals[0]) && isMulti(e.vals[1])),
  },
}

export function algebraLevels(): string[] {
  return Object.keys(GENERATORS)
}

/** Polynomiet som hele koefficienter, hvis det overholder niveauets grænser. */
function accepted(p: Poly | null, gen: AlgebraGen): number[] | null {
  if (!p) return null
  const c = intCoeffs(p)
  return c && gen.valid(c) ? c : null
}

function fillValues(layout: Layout, ops: Op[], gen: AlgebraGen, rng: Rng): Map<CellKey, number[]> | null {
  const values = new Map<CellKey, number[]>()
  const holds = () =>
    layout.equations.every((eq, i) => {
      const v = eq.nums.map((k) => values.get(k))
      if (v.some((x) => !x)) return true
      const left = papply(ops[i], poly(v[0]!), poly(v[1]!))
      return left !== null && pequals(left, poly(v[2]!))
    })
  while (values.size < layout.numKeys.length) {
    const forcedIndex = layout.equations.findIndex((eq) => eq.nums.filter((k) => values.has(k)).length === 2)
    if (forcedIndex >= 0) {
      const eq = layout.equations[forcedIndex]
      const pos = eq.nums.findIndex((k) => !values.has(k)) as 0 | 1 | 2
      const known = eq.nums.map((k) => (values.has(k) ? poly(values.get(k)!) : null)) as [Poly | null, Poly | null, Poly | null]
      const value = accepted(solveForPoly(ops[forcedIndex], pos, known), gen)
      if (!value) return null
      values.set(eq.nums[pos], value)
      if (!holds()) return null
    } else {
      const free = layout.numKeys.filter((k) => !values.has(k))
      const value = gen.random(rng)
      if (!gen.valid(value)) return null
      values.set(rng.pick(free), value)
    }
  }
  return values
}

function buildPuzzle(layout: Layout, ops: Op[], values: Map<CellKey, number[]>, blanks: Set<CellKey>): Puzzle {
  const cells: PuzzleCell[] = []
  for (const [key, kind] of layout.kinds) {
    if (kind !== 'num') continue
    const [r, c] = key.split(',').map(Number)
    cells.push(blanks.has(key) ? { r, c, kind: 'blank' } : { r, c, kind: 'given', value: exprToken(values.get(key)!) })
  }
  layout.equations.forEach((eq, i) => {
    const [r1, c1] = eq.cells[1].split(',').map(Number)
    const [r3, c3] = eq.cells[3].split(',').map(Number)
    cells.push({ r: r1, c: c1, kind: 'op', op: ops[i] }, { r: r3, c: c3, kind: 'eq' })
  })
  cells.sort((a, b) => a.r - b.r || a.c - b.c)
  const equations: Equation[] = layout.equations.map((eq, i) => ({ op: ops[i], nums: eq.nums, cells: eq.cells }))
  const blankList = [...blanks]
  return {
    id: '',
    level: '',
    index: 0,
    rows: layout.rows,
    cols: layout.cols,
    cells,
    equations,
    tiles: blankList.map((k) => exprToken(values.get(k)!)),
    solutions: [Object.fromEntries(blankList.map((k, i) => [k, i]))],
    traps: [],
  }
}

/** Ét tomt felt pr. ligning, så banen kan løses skridt for skridt. */
function chooseBlanks(layout: Layout, ops: Op[], values: Map<CellKey, number[]>, rng: Rng): Set<CellKey> | null {
  const blanks = new Set<CellKey>()
  for (const key of rng.shuffle([...layout.numKeys])) {
    if (blanks.size >= layout.equations.length) break
    blanks.add(key)
    if (!deductionOrder(buildPuzzle(layout, ops, values, blanks))) blanks.delete(key)
  }
  if (blanks.size < layout.equations.length) return null
  if (!layout.equations.some((eq) => blanks.has(eq.nums[2]))) return null
  return blanks
}

/** Fælde-brikker må gerne være lidt "vildere" end niveauets egne tal, men stadig læselige. */
function trapAccepted(p: Poly): number[] | null {
  const c = intCoeffs(p)
  return c && c.length > 0 && deg(c) <= 2 && termCount(c) <= 3 && maxAbs(c) <= 60 ? c : null
}

function isolate(op: Op, pos: 0 | 1 | 2, [a, b, c]: Poly[]): { op: Op; p: Poly; q: Poly } {
  if (pos === 2) return { op, p: a, q: b }
  const inverse: Record<Op, Op> = { '+': '-', '-': '+', '*': ':', ':': '*', af: ':' }
  if (pos === 0) return { op: inverse[op], p: c, q: b }
  if (op === '+' || op === '*') return { op: inverse[op], p: c, q: a }
  return { op, p: a, q: c }
}

function addTraps(puzzle: Puzzle, gen: AlgebraGen, level: LevelInfo, values: Map<CellKey, number[]>, rng: Rng) {
  const blankValues = Object.keys(puzzle.solutions[0]).map((k) => poly(values.get(k)!))
  const candidates: { value: number[]; kind: Trap['kind']; cell: CellKey; equation: number }[] = []
  puzzle.equations.forEach((eq, i) => {
    const vals = eq.nums.map((k) => poly(values.get(k)!))
    eq.nums.forEach((key, pos) => {
      if (!(key in puzzle.solutions[0])) return
      const { op, p, q } = isolate(eq.op, pos as 0 | 1 | 2, vals)
      for (const cand of algebraTrapCandidates(op, p, q, vals[pos])) {
        const c = trapAccepted(cand.value)
        if (c) candidates.push({ value: c, kind: cand.kind, cell: key, equation: i })
      }
    })
  })
  rng.shuffle(candidates)
  // Niveauets egne typiske fejl først, "forkert regnetegn" til sidst.
  const rank = (kind: Trap['kind']) => {
    const i = gen.priority.indexOf(kind)
    return i >= 0 ? i : kind === 'wrong-op' ? 100 : 50
  }
  candidates.sort((x, y) => rank(x.kind) - rank(y.kind))

  const accept = (c: number[]): boolean => {
    const value = exprToken(c)
    if (puzzle.tiles.some((t) => tokenKey(t) === tokenKey(value))) return false
    if (blankValues.some((bv) => pequals(bv, poly(c)))) return false
    return findSolutions({ ...puzzle, tiles: [...puzzle.tiles, value] }, level, 2).length === 1
  }

  const usedKinds = new Set<string>()
  for (const round of [0, 1]) {
    for (const cand of candidates) {
      if (puzzle.traps.length >= gen.trapCount) break
      if (round === 0 && usedKinds.has(cand.kind)) continue
      if (!accept(cand.value)) continue
      puzzle.tiles.push(exprToken(cand.value))
      puzzle.traps.push({ tile: puzzle.tiles.length - 1, equation: cand.equation, cell: cand.cell, kind: cand.kind })
      usedKinds.add(cand.kind)
    }
  }
  let attempts = 0
  while (puzzle.tiles.length < blankValues.length + gen.trapCount && attempts++ < 200) {
    const c = gen.random(rng)
    if (gen.valid(c) && accept(c)) puzzle.tiles.push(exprToken(c))
  }
}

export function generateAlgebraPuzzle(code: string, seed: number, templateName?: string): Puzzle {
  const gen = GENERATORS[code]
  if (!gen) throw new Error(`Ingen algebra-generator til niveau ${code}`)
  const level = levelInfo(code)
  const rng = createRng(seed)
  for (let attempt = 0; attempt < 50000; attempt++) {
    const layout = layoutOf(TEMPLATES[templateName ?? rng.pick(gen.templates)])
    const ops = layout.equations.map(() => rng.pick(gen.ops))
    const values = fillValues(layout, ops, gen, rng)
    if (!values) continue
    const eqVals = layout.equations.map((eq, i) => ({ op: ops[i], vals: eq.nums.map((k) => values.get(k)!) }))
    // Hver ligning skal handle om x – ikke bare tal som 2 − 4 = −2.
    if (!eqVals.every((e) => e.vals.some(hasX)) || !gen.puzzleOk(eqVals)) continue
    const blanks = chooseBlanks(layout, ops, values, rng)
    if (!blanks) continue
    const puzzle = buildPuzzle(layout, ops, values, blanks)
    if (findSolutions(puzzle, level, 2).length !== 1) continue
    addTraps(puzzle, gen, level, values, rng)
    shuffleTiles(puzzle, rng)
    puzzle.level = code
    return puzzle
  }
  throw new Error(`Kunne ikke lave en algebrabane til niveau ${code} (seed ${seed})`)
}

export function generateAlgebraLevel(code: string, count: number, baseSeed: number): Puzzle[] {
  const gen = GENERATORS[code]
  const puzzles: Puzzle[] = []
  const seen = new Set<string>()
  let seed = baseSeed
  while (puzzles.length < count) {
    const template = gen.templates[puzzles.length % gen.templates.length]
    const p = generateAlgebraPuzzle(code, seed++, template)
    const sig = puzzleSignature(p)
    if (seen.has(sig)) continue
    seen.add(sig)
    p.index = puzzles.length + 1
    p.id = `${code}-${String(p.index).padStart(2, '0')}`
    puzzles.push(p)
  }
  return puzzles
}

