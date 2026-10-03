/**
 * Banegenerator til ligninger (ligningstrappen). Køres på forhånd (npm run generate).
 *
 * Hver bane bygges baglæns fra løsningen x: vælg en ligning af niveauets type, skriv trinnene
 * op, og lav brikker til alle tomme felter (operationer og mellemresultater). Fælderne er de
 * typiske fejl i hvert trin. Til sidst tjekkes det, at der kun er én måde at lægge brikkerne på.
 */
import { evaluateLadder, countLadderSolutions, leftKey, rightKey, stepKey, applyStep } from './ladder'
import { tokenKey } from './evaluate'
import { createRng, type Rng } from './rng'
import type { CellKey, LadderPuzzle, LadderStepWhy, MisconceptionKind } from './types'
import { pequals, tokenPoly, type ExprToken, type StepToken } from './value'

const E = (c: number[], extra: { k?: number; d?: number } = {}): ExprToken => {
  const trimmed = [...c]
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === 0) trimmed.pop()
  return { form: 'expr', c: trimmed, ...extra }
}
const num = (n: number) => E([n])
const X = E([0, 1])
const S = (op: StepToken['op'], c: number[]): StepToken => ({ form: 'step', op, c })
/** Fjern et tal fra en side: står der +b, trækkes b fra; står der −b, lægges b til. */
const removeConst = (b: number) => (b > 0 ? S('-', [b]) : S('+', [-b]))
const addConstBack = (b: number) => (b > 0 ? S('+', [b]) : S('-', [-b]))

interface TrapIdea {
  tile: ExprToken | StepToken
  step: number
  cell: CellKey
  kind: MisconceptionKind
}

interface Draft {
  rows: [ExprToken, ExprToken][]
  steps: { tile: StepToken; why: LadderStepWhy }[]
  x: number
  traps: TrapIdea[]
}

interface LadderLevelGen {
  trapCount: number
  /** Kun positive tal på brikkerne (niveau 1–3). */
  positive?: boolean
  make(rng: Rng): Draft | null
}

const nonzero = (rng: Rng, min: number, max: number) => {
  for (;;) {
    const v = rng.int(min, max)
    if (v !== 0) return v
  }
}

const GENERATORS: Record<string, LadderLevelGen> = {
  // x + a = b  og  x − a = b
  L1: {
    positive: true,
    trapCount: 3,
    make(rng) {
      const x = rng.int(2, 25)
      const a = rng.int(2, 19)
      const b = rng.next() < 0.6 ? a : -a // +a eller −a sammen med x
      const right = x + b
      if (right < 1 || right > 40) return null
      return {
        rows: [
          [E([b, 1]), num(right)],
          [X, num(x)],
        ],
        steps: [{ tile: removeConst(b), why: 'konstant' }],
        x,
        traps: [
          { tile: addConstBack(b), step: 0, cell: stepKey(0), kind: 'lig-sign-op' },
          { tile: num(right + b), step: 0, cell: rightKey(1), kind: 'lig-move-sign' },
        ],
      }
    },
  },
  // ax = b  og  x/a = b
  L2: {
    positive: true,
    trapCount: 3,
    make(rng) {
      const a = rng.int(2, 9)
      if (rng.next() < 0.6) {
        const x = rng.int(2, 11)
        const b = a * x
        return {
          rows: [
            [E([0, a]), num(b)],
            [X, num(x)],
          ],
          steps: [{ tile: S(':', [a]), why: 'koefficient' }],
          x,
          traps: [
            { tile: S('-', [a]), step: 0, cell: stepKey(0), kind: 'lig-sub-coef' },
            { tile: num(b - a), step: 0, cell: rightKey(1), kind: 'lig-sub-coef' },
            { tile: S('*', [a]), step: 0, cell: stepKey(0), kind: 'lig-mul-instead' },
          ],
        }
      }
      const b = rng.int(2, 11)
      const x = a * b
      return {
        rows: [
          [E([0, 1], { d: a }), num(b)],
          [X, num(x)],
        ],
        steps: [{ tile: S('*', [a]), why: 'naevner' }],
        x,
        traps: [
          { tile: S(':', [a]), step: 0, cell: stepKey(0), kind: 'lig-div-instead' },
          { tile: num(b + a), step: 0, cell: rightKey(1), kind: 'lig-sub-denom' },
          { tile: S('-', [a]), step: 0, cell: stepKey(0), kind: 'lig-sub-denom' },
        ],
      }
    },
  },
  // ax + b = c  og  ax − b = c
  L3: {
    positive: true,
    trapCount: 4,
    make(rng) {
      const a = rng.int(2, 9)
      const x = rng.int(1, 12)
      const b = rng.next() < 0.6 ? rng.int(1, 20) : -rng.int(1, 20)
      const c = a * x + b
      if (c < 1 || c > 99) return null
      return {
        rows: [
          [E([b, a]), num(c)],
          [E([0, a]), num(a * x)],
          [X, num(x)],
        ],
        steps: [
          { tile: removeConst(b), why: 'konstant' },
          { tile: S(':', [a]), why: 'koefficient' },
        ],
        x,
        traps: [
          { tile: addConstBack(b), step: 0, cell: stepKey(0), kind: 'lig-sign-op' },
          { tile: num(c + b), step: 0, cell: rightKey(1), kind: 'lig-move-sign' },
          { tile: S('-', [a]), step: 1, cell: stepKey(1), kind: 'lig-sub-coef' },
          { tile: num(a * x - a), step: 1, cell: rightKey(2), kind: 'lig-sub-coef' },
        ],
      }
    },
  },
  // ax + b = cx + d  (x på begge sider)
  L4: {
    trapCount: 4,
    make(rng) {
      const c = rng.int(1, 5)
      const a = c + rng.int(2, 6)
      const x = nonzero(rng, -9, 12)
      const b = rng.int(1, 20)
      const d = (a - c) * x + b
      if (d === 0 || Math.abs(d) > 60 || d === b) return null
      const k = a - c
      return {
        rows: [
          [E([b, a]), E([d, c])],
          [E([b, k]), num(d)],
          [E([0, k]), num(d - b)],
          [X, num(x)],
        ],
        steps: [
          { tile: S('-', [0, c]), why: 'xled' },
          { tile: S('-', [b]), why: 'konstant' },
          { tile: S(':', [k]), why: 'koefficient' },
        ],
        x,
        traps: [
          { tile: S('+', [0, c]), step: 0, cell: stepKey(0), kind: 'lig-x-sign' },
          { tile: E([b, a + c]), step: 0, cell: leftKey(1), kind: 'lig-x-sign' },
          { tile: E([d, c]), step: 0, cell: rightKey(1), kind: 'lig-one-side' },
          { tile: num(d + b), step: 1, cell: rightKey(2), kind: 'lig-move-sign' },
          { tile: num(d - b - k), step: 2, cell: rightKey(3), kind: 'lig-sub-coef' },
        ],
      }
    },
  },
  // a(x + b) = c  og  (x + b)/a = c
  L5: {
    trapCount: 4,
    make(rng) {
      const a = rng.int(2, 6)
      const x = nonzero(rng, -9, 12)
      const b = nonzero(rng, -9, 9)
      const inner = x + b
      if (inner === 0) return null
      if (rng.next() < 0.55) {
        const c = a * inner
        if (Math.abs(c) > 99) return null
        return {
          rows: [
            [E([b, 1], { k: a }), num(c)],
            [E([b, 1]), num(inner)],
            [X, num(x)],
          ],
          steps: [
            { tile: S(':', [a]), why: 'parentes' },
            { tile: removeConst(b), why: 'konstant' },
          ],
          x,
          traps: [
            { tile: S('-', [a]), step: 0, cell: stepKey(0), kind: 'lig-sub-coef' },
            { tile: num(c - a), step: 0, cell: rightKey(1), kind: 'lig-sub-coef' },
            { tile: addConstBack(b), step: 1, cell: stepKey(1), kind: 'lig-sign-op' },
            { tile: num(inner + b), step: 1, cell: rightKey(2), kind: 'lig-move-sign' },
          ],
        }
      }
      const c = inner
      const product = a * c
      if (Math.abs(product) > 99 || product === b) return null
      // (x + b)/a = c  →  · a  →  x + b = a·c  →  ∓b  →  x
      return {
        rows: [
          [E([b, 1], { d: a }), num(c)],
          [E([b, 1]), num(product)],
          [X, num(product - b)],
        ],
        steps: [
          { tile: S('*', [a]), why: 'naevner' },
          { tile: removeConst(b), why: 'konstant' },
        ],
        x: product - b,
        traps: [
          { tile: S(':', [a]), step: 0, cell: stepKey(0), kind: 'lig-div-instead' },
          { tile: num(c), step: 0, cell: rightKey(1), kind: 'lig-one-side' },
          { tile: addConstBack(b), step: 1, cell: stepKey(1), kind: 'lig-sign-op' },
          { tile: num(product + b), step: 1, cell: rightKey(2), kind: 'lig-move-sign' },
        ],
      }
    },
  },
}

export function ladderLevels(): string[] {
  return Object.keys(GENERATORS)
}

/** Passer trinnene sammen? (Sikkerhedstjek af hver kladde.) */
function consistent(d: Draft): boolean {
  return d.steps.every(({ tile }, i) => {
    const [l0, r0] = d.rows[i]
    const [l1, r1] = d.rows[i + 1]
    const l = applyStep(tile, tokenPoly(l0))
    const r = applyStep(tile, tokenPoly(r0))
    return l !== null && r !== null && pequals(l, tokenPoly(l1)) && pequals(r, tokenPoly(r1))
  })
}

function build(code: string, d: Draft, gen: LadderLevelGen, rng: Rng): LadderPuzzle | null {
  const last = d.rows.length - 1
  const puzzle: LadderPuzzle = {
    kind: 'ladder',
    id: '',
    index: 0,
    level: code,
    rows: d.rows.map(([l, r], i) => ({
      left: i === 0 || i === last ? { kind: 'given', value: l } : { kind: 'blank' },
      right: i === 0 ? { kind: 'given', value: r } : { kind: 'blank' },
    })),
    steps: d.steps.map(({ why }) => ({ slot: { kind: 'blank' }, why })),
    tiles: [],
    solution: {},
    traps: [],
    x: d.x,
  }
  // Rigtige brikker til alle tomme felter.
  d.steps.forEach(({ tile }, i) => {
    puzzle.solution[stepKey(i)] = puzzle.tiles.push(tile) - 1
    if (puzzle.rows[i + 1].left.kind === 'blank')
      puzzle.solution[leftKey(i + 1)] = puzzle.tiles.push(d.rows[i + 1][0]) - 1
    puzzle.solution[rightKey(i + 1)] = puzzle.tiles.push(d.rows[i + 1][1]) - 1
  })
  if (countLadderSolutions(puzzle) !== 1) return null

  /** Et tal som fælde: ikke 0, højst 99 – og ikke negativt på niveauer med kun positive tal. */
  const allowed = (t: ExprToken) =>
    t.c.length > 0 && t.c.every((v) => Math.abs(v) <= 99) && !(gen.positive && t.c.length === 1 && t.c[0] < 0)

  // Fælder: typiske fejl – kun dem, der ikke giver en anden gyldig løsning.
  const correctKeys = new Set(puzzle.tiles.map(tokenKey))
  for (const trap of rng.shuffle([...d.traps])) {
    if (puzzle.traps.length >= gen.trapCount) break
    const key = tokenKey(trap.tile)
    if (correctKeys.has(key) || puzzle.tiles.some((t) => tokenKey(t) === key)) continue
    if (trap.tile.form === 'expr' && !allowed(trap.tile)) continue
    puzzle.tiles.push(trap.tile)
    if (countLadderSolutions(puzzle) !== 1) {
      puzzle.tiles.pop()
      continue
    }
    puzzle.traps.push({ tile: puzzle.tiles.length - 1, step: trap.step, cell: trap.cell, kind: trap.kind })
  }
  // Mangler der fælder, fyldes op med tal tæt på løsningen.
  for (
    let tries = 0;
    puzzle.tiles.length < Object.keys(puzzle.solution).length + gen.trapCount && tries < 50;
    tries++
  ) {
    const value = num(d.x + rng.pick([-3, -2, -1, 1, 2, 3]) * rng.int(1, 3))
    if (!allowed(value) || puzzle.tiles.some((t) => tokenKey(t) === tokenKey(value))) continue
    puzzle.tiles.push(value)
    if (countLadderSolutions(puzzle) !== 1) puzzle.tiles.pop()
  }

  // Bland brikkerne.
  const order = rng.shuffle(puzzle.tiles.map((_, i) => i))
  const newIndex = new Map(order.map((old, i) => [old, i]))
  puzzle.tiles = order.map((i) => puzzle.tiles[i])
  puzzle.solution = Object.fromEntries(Object.entries(puzzle.solution).map(([k, i]) => [k, newIndex.get(i)!]))
  puzzle.traps = puzzle.traps.map((t) => ({ ...t, tile: newIndex.get(t.tile)! }))

  // Sidste tjek: løsningen går op.
  return evaluateLadder(puzzle, puzzle.solution).solved ? puzzle : null
}

export function generateLadder(code: string, seed: number): LadderPuzzle {
  const gen = GENERATORS[code]
  if (!gen) throw new Error(`Ingen ligningsgenerator til niveau ${code}`)
  const rng = createRng(seed)
  for (let attempt = 0; attempt < 5000; attempt++) {
    const draft = gen.make(rng)
    if (!draft || !consistent(draft)) continue
    const puzzle = build(code, draft, gen, rng)
    if (puzzle) return puzzle
  }
  throw new Error(`Kunne ikke lave en ligning til niveau ${code} (seed ${seed})`)
}

/** Fingeraftryk af ligningen, så det samme stykke ikke kommer to gange. */
function signature(p: LadderPuzzle): string {
  const [l, r] = [p.rows[0].left, p.rows[0].right]
  return l.kind === 'given' && r.kind === 'given' ? `${tokenKey(l.value)}=${tokenKey(r.value)}` : ''
}

export function generateLadderLevel(code: string, count: number, baseSeed: number): LadderPuzzle[] {
  const puzzles: LadderPuzzle[] = []
  const seen = new Set<string>()
  let seed = baseSeed
  while (puzzles.length < count) {
    const p = generateLadder(code, seed++)
    const sig = signature(p)
    if (seen.has(sig)) continue
    seen.add(sig)
    p.index = puzzles.length + 1
    p.id = `${code}-${String(p.index).padStart(2, '0')}`
    puzzles.push(p)
  }
  return puzzles
}
