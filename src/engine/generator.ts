/**
 * Banegenerator. Køres på forhånd (npm run generate) – ikke i browseren.
 *
 * Fremgangsmåde:
 *  1. Vælg en layout-skabelon og et regnetegn til hver ligning.
 *  2. Fyld alle tal-felter, så alle ligninger går op, og alle tal er "pæne".
 *  3. Gør ét felt pr. ligning tomt, så banen kan løses skridt for skridt
 *     (hele tiden en ligning, hvor der kun mangler ét tal). På højere niveauer
 *     kan der komme ekstra tomme felter, som kun kan løses ved at se på brikkerne.
 *  4. Tilføj fælde-brikker (typiske fejl).
 *  5. Kontrollér, at der er præcis én løsning.
 */
import {
  apply,
  decimals,
  equals,
  frac,
  gcd,
  isInteger,
  reduce,
  token,
  toNumber,
  type Form,
  type Frac,
  type Op,
} from './fraction'
import { levelInfo, type LevelInfo } from './levels'
import { percentTrapCandidates, trapCandidates, type TrapOptions } from './misconceptions'
import { createRng, type Rng } from './rng'
import { deductionOrder, findSolutions, solveFor } from './solver'
import { equationCells, TEMPLATES, type Template } from './templates'
import { tokenKey } from './evaluate'
import { cellKey, type CellKey, type Equation, type Puzzle, type PuzzleCell, type Trap } from './types'

interface GenContext {
  commonDen?: number
}

/** Et tal-felts rolle: almindeligt tal eller procent (første led i "p % af x"). */
type Role = 'num' | 'pct'

interface LevelGen {
  templates: string[]
  ops: Op[]
  form: Form
  /** Skal tomme felter kræve en bestemt skriveform (decimal/procent)? */
  cellForms?: boolean
  /** Tomme felter ud over ét pr. ligning. Kræver, at eleven bruger brikkerne til at ræsonnere. */
  extraBlanks: number
  trapCount: number
  trapOptions: TrapOptions
  setup(rng: Rng): GenContext
  randomValue(rng: Rng, ctx: GenContext, role?: Role): Frac
  valid(f: Frac, ctx: GenContext, role?: Role): boolean
  /** Hvor store/små fælde-brikker må være. */
  trapValid?(f: Frac): boolean
  /** Ekstra krav til hele banen. */
  puzzleOk(eqs: { op: Op; vals: Frac[] }[]): boolean
}

const noTraps = { negatives: false, reductionTraps: false, improperTraps: false }

function randomProper(rng: Rng, dens: number[], maxValue: number): Frac {
  for (;;) {
    const d = rng.pick(dens)
    const n = rng.int(1, Math.max(1, Math.floor(maxValue * d) - 1))
    if (gcd(n, d) === 1 && n % d !== 0) return frac(n, d)
  }
}

const L2_DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12]
const L3_DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12]
const L4_DENS = [2, 3, 4, 5, 6, 8, 10, 12]
const L5_DENS = [2, 3, 4, 5, 6, 8, 10, 12]

/** Endeligt decimaltal med højst `maxDec` decimaler og højst `maxDigits` cifre i alt. */
function decimalOk(f: Frac, maxDec: number, maxDigits: number): boolean {
  const k = decimals(f)
  if (k === null || k > maxDec) return false
  return String(Math.abs(Math.round((f.n * 10 ** k) / f.d))).length <= maxDigits
}

const PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 120, 150]

const GENERATORS: Record<string, LevelGen> = {
  1: {
    templates: ['pi', 'beam', 'hshape', 'zig', 'square'],
    ops: ['+', '-'],
    form: 'frac',
    extraBlanks: 0,
    trapCount: 2,
    trapOptions: { form: 'frac', ...noTraps },
    // Alle tal skal have præcis den fælles nævner i forkortet form (se `valid`).
    // randomProper vælger kun tællere uden fælles faktor med nævneren, og
    // udregnede tal, der kan forkortes til en anden nævner, afvises af `valid`.
    setup: (rng) => ({ commonDen: rng.pick([5, 7, 9, 11]) }),
    randomValue: (rng, ctx) => randomProper(rng, [ctx.commonDen!], 1),
    valid: (f, ctx) => f.d === ctx.commonDen && f.n > 0 && toNumber(f) < 2,
    puzzleOk: () => true,
  },
  2: {
    templates: ['pi', 'beam', 'hshape', 'zig', 'square', 'stairs'],
    ops: ['+', '-'],
    form: 'frac',
    extraBlanks: 0,
    trapCount: 3,
    trapOptions: { form: 'frac', ...noTraps },
    setup: () => ({}),
    randomValue: (rng) => randomProper(rng, L2_DENS, 2),
    valid: (f) => L2_DENS.includes(f.d) && f.n > 0 && toNumber(f) < 3,
    // Højst én ligning må have samme nævner i de to led.
    puzzleOk: (eqs) => eqs.filter((e) => e.vals[0].d === e.vals[1].d).length <= 1,
  },
  3: {
    templates: ['pi', 'beam', 'hshape', 'zig', 'square'],
    ops: ['*', ':'],
    form: 'frac',
    extraBlanks: 0,
    trapCount: 3,
    trapOptions: { form: 'frac', negatives: false, reductionTraps: true, improperTraps: false },
    setup: () => ({}),
    randomValue: (rng) => (rng.next() < 0.3 ? frac(rng.int(2, 6)) : randomProper(rng, L3_DENS, 2)),
    valid: (f) =>
      (f.d === 1 || L3_DENS.includes(f.d)) && f.n > 0 && f.n <= 30 && toNumber(f) <= 12 && !(f.n === 1 && f.d === 1),
    // Hver ligning skal indeholde mindst én rigtig brøk.
    puzzleOk: (eqs) => eqs.every((e) => e.vals.some((v) => !isInteger(v))),
  },
  4: {
    templates: ['beam', 'hshape', 'zig', 'square'],
    ops: ['+', '-'],
    form: 'mixed',
    extraBlanks: 0,
    trapCount: 3,
    trapOptions: { form: 'mixed', negatives: false, reductionTraps: true, improperTraps: true },
    setup: () => ({}),
    randomValue: (rng) => {
      const f = randomProper(rng, L4_DENS, 1)
      return reduce(frac(f.n + rng.int(0, 4) * f.d, f.d))
    },
    valid: (f) => L4_DENS.includes(f.d) && f.n > 0 && toNumber(f) < 8,
    // Mindst halvdelen af tallene skal være blandede tal.
    puzzleOk: (eqs) => {
      const all = eqs.flatMap((e) => e.vals)
      return all.filter((v) => v.n > v.d).length * 2 >= all.length
    },
  },
  5: {
    templates: ['square', 'stairs', 'kite', 'snake', 'anchor'],
    ops: ['+', '-', '*', ':'],
    form: 'frac',
    extraBlanks: 2,
    trapCount: 4,
    trapOptions: { form: 'frac', negatives: true, reductionTraps: true, improperTraps: false },
    setup: () => ({}),
    randomValue: (rng) => {
      const f = rng.next() < 0.15 ? frac(rng.int(2, 4)) : randomProper(rng, L5_DENS, 2)
      return rng.next() < 0.5 ? frac(-f.n, f.d) : f
    },
    valid: (f) =>
      (f.d === 1 || L5_DENS.includes(f.d)) &&
      f.n !== 0 &&
      !(Math.abs(f.n) === 1 && f.d === 1) &&
      Math.abs(f.n) <= 30 &&
      Math.abs(toNumber(f)) <= 6,
    puzzleOk: (eqs) => {
      const all = eqs.flatMap((e) => e.vals)
      const negatives = all.filter((v) => v.n < 0).length
      const ops = new Set(eqs.map((e) => e.op))
      return negatives * 3 >= all.length && ops.size >= 3 && all.some((v) => !isInteger(v))
    },
  },
  P1: {
    templates: ['pi', 'beam', 'hshape', 'zig', 'square', 'stairs'],
    ops: ['+', '-'],
    form: 'dec',
    cellForms: true,
    extraBlanks: 0,
    trapCount: 3,
    trapOptions: { form: 'dec', ...noTraps },
    setup: () => ({}),
    randomValue: (rng) => {
      const k = rng.pick([1, 1, 2])
      return reduce(frac(rng.int(1, k === 1 ? 250 : 999), 10 ** k))
    },
    valid: (f) => decimalOk(f, 2, 4) && f.n > 0 && toNumber(f) < 100,
    trapValid: (f) => f.n > 0 && decimalOk(f, 3, 5),
    // Mindst én ligning skal have led med forskelligt antal decimaler (0,7 + 0,25).
    puzzleOk: (eqs) =>
      eqs.some((e) => decimals(e.vals[0]) !== decimals(e.vals[1])) &&
      eqs.every((e) => e.vals.some((v) => !isInteger(v))),
  },
  P2: {
    templates: ['pi', 'beam', 'hshape', 'zig', 'square'],
    ops: ['*', ':'],
    form: 'dec',
    cellForms: true,
    extraBlanks: 0,
    trapCount: 3,
    trapOptions: { form: 'dec', ...noTraps },
    setup: () => ({}),
    randomValue: (rng) => {
      const r = rng.next()
      if (r < 0.3) return frac(rng.int(2, 12))
      if (r < 0.75) return reduce(frac(rng.int(1, 49), 10))
      return reduce(frac(rng.int(1, 20) * 5, 100))
    },
    valid: (f) => decimalOk(f, 2, 4) && f.n > 0 && toNumber(f) <= 200 && !(f.n === 1 && f.d === 1),
    trapValid: (f) => f.n > 0 && decimalOk(f, 3, 5),
    puzzleOk: (eqs) => eqs.every((e) => e.vals.some((v) => !isInteger(v))),
  },
  P3: {
    templates: ['pi', 'beam', 'hshape', 'zig', 'square'],
    ops: ['af', 'af', '+', '-'],
    form: 'dec',
    cellForms: true,
    extraBlanks: 0,
    trapCount: 3,
    trapOptions: { form: 'dec', ...noTraps },
    setup: () => ({}),
    randomValue: (rng, _ctx, role) => {
      if (role === 'pct') return frac(rng.pick(PERCENTS), 100)
      return rng.next() < 0.7 ? frac(rng.int(2, 40) * 10) : frac(rng.int(4, 80) * 5)
    },
    valid: (f, _ctx, role) => {
      if (role === 'pct') {
        const p = frac(f.n * 100, f.d)
        return decimalOk(p, 1, 4) && toNumber(p) >= 1 && toNumber(p) <= 200
      }
      return decimalOk(f, 2, 4) && f.n > 0 && toNumber(f) <= 2000
    },
    trapValid: (f) => f.n > 0 && decimalOk(f, 3, 5),
    // Mindst halvdelen af ligningerne skal være "procent af".
    puzzleOk: (eqs) => eqs.filter((e) => e.op === 'af').length * 2 >= eqs.length,
  },
}

export function generatorLevels(): string[] {
  return Object.keys(GENERATORS)
}

export interface Layout {
  rows: number
  cols: number
  equations: { nums: [CellKey, CellKey, CellKey]; cells: CellKey[] }[]
  numKeys: CellKey[]
  kinds: Map<CellKey, 'num' | 'op' | 'eq'>
}

export function layoutOf(template: Template): Layout {
  const kinds = new Map<CellKey, 'num' | 'op' | 'eq'>()
  let rows = 0
  let cols = 0
  const equations = template.equations.map((teq) => {
    const coords = equationCells(teq)
    const keys = coords.map(([r, c]) => cellKey(r, c))
    coords.forEach(([r, c], i) => {
      const kind = i % 2 === 0 ? 'num' : i === 1 ? 'op' : 'eq'
      const key = cellKey(r, c)
      const existing = kinds.get(key)
      if (existing && (existing !== 'num' || kind !== 'num')) {
        throw new Error(`Skabelon ${template.name}: felt ${key} bruges af to ligninger`)
      }
      kinds.set(key, kind)
      rows = Math.max(rows, r + 1)
      cols = Math.max(cols, c + 1)
    })
    return { nums: [keys[0], keys[2], keys[4]] as [CellKey, CellKey, CellKey], cells: keys }
  })
  const numKeys = [...kinds.entries()].filter(([, k]) => k === 'num').map(([key]) => key)
  return { rows, cols, equations, numKeys, kinds }
}

/**
 * Hvilke felter er procenter? Det er første led i en "af"-ligning.
 * Et procent-felt må ikke samtidig være et almindeligt tal i en anden ligning.
 * Returnerer null, hvis regnetegnene ikke passer sammen på den måde.
 */
function rolesFor(layout: Layout, ops: Op[]): Map<CellKey, Role> | null {
  const roles = new Map<CellKey, Role>(layout.numKeys.map((k) => [k, 'num']))
  layout.equations.forEach((eq, i) => {
    if (ops[i] === 'af') roles.set(eq.nums[0], 'pct')
  })
  const consistent = layout.equations.every((eq, i) =>
    eq.nums.every((k, pos) => (roles.get(k) === 'pct') === (ops[i] === 'af' && pos === 0)),
  )
  return consistent ? roles : null
}

/** Trin 2: fyld alle tal-felter. Returnerer null, hvis forsøget mislykkes. */
function fillValues(
  layout: Layout,
  ops: Op[],
  roles: Map<CellKey, Role>,
  gen: LevelGen,
  ctx: GenContext,
  rng: Rng,
): Map<CellKey, Frac> | null {
  const values = new Map<CellKey, Frac>()
  const holds = () =>
    layout.equations.every((eq, i) => {
      const v = eq.nums.map((k) => values.get(k))
      return v.some((x) => !x) || equals(apply(ops[i], v[0]!, v[1]!), v[2]!)
    })
  while (values.size < layout.numKeys.length) {
    const forcedIndex = layout.equations.findIndex((eq) => eq.nums.filter((k) => values.has(k)).length === 2)
    if (forcedIndex >= 0) {
      const eq = layout.equations[forcedIndex]
      const pos = eq.nums.findIndex((k) => !values.has(k)) as 0 | 1 | 2
      const known = eq.nums.map((k) => values.get(k) ?? null) as [Frac | null, Frac | null, Frac | null]
      const value = solveFor(ops[forcedIndex], pos, known)
      if (!value || !gen.valid(value, ctx, roles.get(eq.nums[pos]))) return null
      values.set(eq.nums[pos], value)
      if (!holds()) return null
    } else {
      const free = layout.numKeys.filter((k) => !values.has(k))
      const key = rng.pick(free)
      const value = gen.randomValue(rng, ctx, roles.get(key))
      if (!gen.valid(value, ctx, roles.get(key))) return null
      values.set(key, value)
    }
  }
  return values
}

/** Skriveformen for et tal-felt. */
interface Forms {
  of(key: CellKey): Form
  /** Skal de tomme felter have deres krævede form med i banen? */
  onBlanks: boolean
}

function formsFor(gen: LevelGen, roles: Map<CellKey, Role>): Forms {
  return { of: (key) => (roles.get(key) === 'pct' ? 'pct' : gen.form), onBlanks: gen.cellForms ?? false }
}

function buildPuzzle(
  layout: Layout,
  ops: Op[],
  values: Map<CellKey, Frac>,
  blanks: Set<CellKey>,
  forms: Forms,
): Puzzle {
  const cells: PuzzleCell[] = []
  for (const [key, kind] of layout.kinds) {
    const [r, c] = key.split(',').map(Number)
    if (kind !== 'num') continue
    if (!blanks.has(key)) cells.push({ r, c, kind: 'given', value: token(values.get(key)!, forms.of(key)) })
    else if (forms.onBlanks) cells.push({ r, c, kind: 'blank', form: forms.of(key) })
    else cells.push({ r, c, kind: 'blank' })
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
    tiles: blankList.map((k) => token(values.get(k)!, forms.of(k))),
    solutions: [Object.fromEntries(blankList.map((k, i) => [k, i]))],
    traps: [],
  }
}

/**
 * Trin 3: vælg tomme felter.
 * Hver løst ligning giver præcis ét nyt tal, så skridt-for-skridt-løsning
 * giver højst ét tomt felt pr. ligning. Ekstra tomme felter accepteres kun,
 * hvis brikkerne stadig giver én entydig løsning.
 */
function chooseBlanks(
  layout: Layout,
  values: Map<CellKey, Frac>,
  ops: Op[],
  gen: LevelGen,
  forms: Forms,
  level: LevelInfo,
  rng: Rng,
) {
  const target = layout.equations.length
  const blanks = new Set<CellKey>()
  const order = rng.shuffle([...layout.numKeys])
  for (const key of order) {
    if (blanks.size >= target) break
    blanks.add(key)
    if (!deductionOrder(buildPuzzle(layout, ops, values, blanks, forms))) blanks.delete(key)
  }
  if (blanks.size < target) return null
  // Mindst ét resultat skal være tomt, ellers er der ingen steder at lægge fælder.
  if (!layout.equations.some((eq) => blanks.has(eq.nums[2]))) return null
  let extra = 0
  for (const key of order) {
    if (extra >= gen.extraBlanks) break
    if (blanks.has(key)) continue
    blanks.add(key)
    if (findSolutions(buildPuzzle(layout, ops, values, blanks, forms), level, 2).length === 1) extra++
    else blanks.delete(key)
  }
  if (extra < gen.extraBlanks) return null
  return blanks
}

/** Standardgrænser for brøk-fælder: ikke for store tal, og kun negative hvis niveauet har negative tal. */
function fracTrapValid(f: Frac, negatives: boolean): boolean {
  if (f.n === 0 || f.d > 36 || Math.abs(f.n) > 72) return false
  if (!negatives && f.n < 0) return false
  return Math.abs(toNumber(f)) <= 15
}

/**
 * Omskriver a ∘ b = c, så det ukendte tal står alene: x = p ∘' q.
 * Fx  ? + 1/3 = 5/6  ->  ? = 5/6 − 1/3.  Så kan de typiske fejl for ∘' bruges.
 */
function isolate(op: Op, pos: 0 | 1 | 2, [a, b, c]: Frac[]): { op: Op; p: Frac; q: Frac } {
  if (pos === 2) return { op, p: a, q: b }
  const inverse: Record<Op, Op> = { '+': '-', '-': '+', '*': ':', ':': '*', af: ':' }
  if (pos === 0) return { op: inverse[op], p: c, q: b }
  // b ukendt: a + b = c -> c − a,  a − b = c -> a − c,  a · b = c -> c : a,  a : b = c -> a : c
  if (op === '+' || op === '*') return { op: inverse[op], p: c, q: a }
  return { op, p: a, q: c }
}

/** Trin 4 og 5: fælder – og kontrol af, at løsningen stadig er entydig. */
function addTraps(
  puzzle: Puzzle,
  gen: LevelGen,
  level: LevelInfo,
  values: Map<CellKey, Frac>,
  forms: Forms,
  rng: Rng,
  ctx: GenContext,
) {
  const blankValues = Object.keys(puzzle.solutions[0]).map((k) => values.get(k)!)
  type Candidate = { value: ReturnType<typeof token>; kind: Trap['kind']; cell: CellKey; equation: number }
  const candidates: Candidate[] = []
  puzzle.equations.forEach((eq, i) => {
    const vals = eq.nums.map((k) => values.get(k)!)
    eq.nums.forEach((key, pos) => {
      if (!(key in puzzle.solutions[0])) return
      const unknown = pos as 0 | 1 | 2
      let found
      if (eq.op === 'af') found = percentTrapCandidates(unknown, vals[0], vals[1], vals[2])
      else {
        const { op, p, q } = isolate(eq.op, unknown, vals)
        found = trapCandidates(op, p, q, vals[pos], gen.trapOptions)
      }
      for (const cand of found) candidates.push({ ...cand, cell: key, equation: i })
      // Procent-felt: den rigtige værdi skrevet som decimaltal (0,25 i stedet for 25 %).
      if (forms.of(key) === 'pct') {
        candidates.push({ value: token(vals[pos], 'dec'), kind: 'as-percent', cell: key, equation: i })
      }
    })
  })
  rng.shuffle(candidates)

  const accept = (value: ReturnType<typeof token>): boolean => {
    const f = frac(value.n, value.d)
    if (!(gen.trapValid ? gen.trapValid(f) : fracTrapValid(f, gen.trapOptions.negatives))) return false
    if (puzzle.tiles.some((t) => tokenKey(t) === tokenKey(value))) return false
    const trial = { ...puzzle, tiles: [...puzzle.tiles, value] }
    return findSolutions(trial, level, 2).length === 1
  }

  const take = (cand: Candidate): boolean => {
    const v = frac(cand.value.n, cand.value.d)
    // En fælde må ikke have samme værdi som et tomt felt – så var den jo ikke forkert.
    if (!isFormTrap(cand.kind) && blankValues.some((bv) => equals(bv, v))) return false
    if (!accept(cand.value)) return false
    puzzle.tiles.push(cand.value)
    puzzle.traps.push({ tile: puzzle.tiles.length - 1, equation: cand.equation, cell: cand.cell, kind: cand.kind })
    return true
  }

  // Præcis én form-fælde (uforkortet / ikke blandet tal), hvis niveauet har dem.
  const formCands = candidates.filter((c) => isFormTrap(c.kind))
  for (const cand of formCands) if (take(cand)) break
  // Derefter så mange forskellige slags fejl som muligt – og så resten.
  const usedKinds = new Set<string>(puzzle.traps.map((t) => t.kind))
  const others = candidates.filter((c) => !isFormTrap(c.kind))
  for (const round of [0, 1]) {
    for (const cand of others) {
      if (puzzle.traps.length >= gen.trapCount) break
      if (round === 0 && usedKinds.has(cand.kind)) continue
      if (take(cand)) usedKinds.add(cand.kind)
    }
  }

  // Er der ikke fejl-fælder nok, fyldes op med tilfældige, pæne tal.
  let attempts = 0
  while (puzzle.tiles.length < blankValues.length + gen.trapCount && attempts++ < 200) {
    const f = gen.randomValue(rng, ctx, 'num')
    if (blankValues.some((bv) => equals(bv, f))) continue
    const value = token(f, gen.form)
    if (accept(value)) puzzle.tiles.push(value)
  }
}

function isFormTrap(kind: string): boolean {
  return kind === 'not-reduced' || kind === 'improper' || kind === 'as-percent' || kind === 'as-decimal'
}

/** Bland brikkerne og opdater alle indeks, der peger på dem. */
export function shuffleTiles(puzzle: Puzzle, rng: Rng) {
  const order = rng.shuffle(puzzle.tiles.map((_, i) => i))
  const newIndex = new Map(order.map((oldI, newI) => [oldI, newI]))
  puzzle.tiles = order.map((i) => puzzle.tiles[i])
  puzzle.solutions = puzzle.solutions.map((s) =>
    Object.fromEntries(Object.entries(s).map(([k, i]) => [k, newIndex.get(i)!])),
  )
  puzzle.traps = puzzle.traps.map((t) => ({ ...t, tile: newIndex.get(t.tile)! }))
}

/** Laver én bane. Prøver igen og igen, indtil alle krav er opfyldt. */
export function generatePuzzle(code: string, seed: number, templateName?: string): Puzzle {
  const gen = GENERATORS[code]
  if (!gen) throw new Error(`Ingen generator til niveau ${code}`)
  const level = levelInfo(code)
  const rng = createRng(seed)
  for (let attempt = 0; attempt < 20000; attempt++) {
    const template = TEMPLATES[templateName ?? rng.pick(gen.templates)]
    const layout = layoutOf(template)
    const ops = layout.equations.map(() => rng.pick(gen.ops))
    const roles = rolesFor(layout, ops)
    if (!roles) continue
    const forms = formsFor(gen, roles)
    const ctx = gen.setup(rng)
    const values = fillValues(layout, ops, roles, gen, ctx, rng)
    if (!values) continue
    const eqVals = layout.equations.map((eq, i) => ({ op: ops[i], vals: eq.nums.map((k) => values.get(k)!) }))
    if (!gen.puzzleOk(eqVals)) continue
    const blanks = chooseBlanks(layout, values, ops, gen, forms, level, rng)
    if (!blanks) continue
    const puzzle = buildPuzzle(layout, ops, values, blanks, forms)
    if (findSolutions(puzzle, level, 2).length !== 1) continue
    addTraps(puzzle, gen, level, values, forms, rng, ctx)
    shuffleTiles(puzzle, rng)
    puzzle.level = code
    return puzzle
  }
  throw new Error(`Kunne ikke lave en bane til niveau ${code} (seed ${seed})`)
}

/** En "fingeraftryk" af banen, så vi undgår dubletter. */
export function puzzleSignature(p: Puzzle): string {
  return p.equations
    .map((eq) => eq.op)
    .join('') + '|' + p.cells.map((c) => (c.kind === 'given' ? tokenKey(c.value) : c.kind)).join(',')
}

export function generateLevel(code: string, count: number, baseSeed: number): Puzzle[] {
  const gen = GENERATORS[code]
  const puzzles: Puzzle[] = []
  const seen = new Set<string>()
  let seed = baseSeed
  while (puzzles.length < count) {
    // Skabelonerne skiftes på skift, så banerne ser forskellige ud.
    const template = gen.templates[puzzles.length % gen.templates.length]
    const p = generatePuzzle(code, seed++, template)
    const sig = puzzleSignature(p)
    if (seen.has(sig)) continue
    seen.add(sig)
    p.index = puzzles.length + 1
    p.id = `${code}-${String(p.index).padStart(2, '0')}`
    puzzles.push(p)
  }
  return puzzles
}
