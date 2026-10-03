import { describe, expect, it } from 'vitest'
import data from '../data/puzzles.json'
import { equals } from './fraction'
import {
  countLadderSolutions,
  evaluateLadder,
  ladderBlankKeys,
  ladderExplain,
  ladderHintTarget,
  ladderProof,
  sameValue,
} from './ladder'
import { pevalAt, stepText, tokenPoly, valueText, type ExprToken, type StepToken } from './value'
import type { Board } from './evaluate'
import type { LadderPuzzle, PuzzleFile } from './types'

const file = data as unknown as PuzzleFile

const E = (c: number[], extra: { k?: number; d?: number } = {}): ExprToken => ({ form: 'expr', c, ...extra })
const S = (op: StepToken['op'], c: number[]): StepToken => ({ form: 'step', op, c })

describe('ligningstrappen – motor', () => {
  it('2(x + 3) og 2x + 6 er det samme udtryk', () => {
    expect(sameValue(E([3, 1], { k: 2 }), E([6, 2]))).toBe(true)
    expect(sameValue(E([3, 1], { d: 2 }), E([6, 2]))).toBe(false)
    expect(sameValue(S('-', [5]), S('+', [5]))).toBe(false)
  })

  it('skriver operationer og udtryk som på papir', () => {
    expect(stepText(S('-', [5]))).toBe('−5')
    expect(stepText(S(':', [3]))).toBe(': 3')
    expect(stepText(S('-', [0, 2]))).toBe('−2x')
    expect(valueText(E([3, 1], { k: 2 }))).toBe('2(x + 3)')
    expect(valueText(E([0, 1], { d: 3 }))).toBe('x/3')
    expect(valueText(E([-2, 1], { d: 5 }))).toBe('(x − 2)/5')
  })

  // 3x + 5 = 20  →  −5  →  3x = 15  →  : 3  →  x = 5
  const lad: LadderPuzzle = {
    kind: 'ladder',
    id: 'T-01',
    index: 1,
    level: 'L3',
    rows: [
      { left: { kind: 'given', value: E([5, 3]) }, right: { kind: 'given', value: E([20]) } },
      { left: { kind: 'blank' }, right: { kind: 'blank' } },
      { left: { kind: 'given', value: E([0, 1]) }, right: { kind: 'blank' } },
    ],
    steps: [
      { slot: { kind: 'blank' }, why: 'konstant' },
      { slot: { kind: 'blank' }, why: 'koefficient' },
    ],
    tiles: [S('-', [5]), E([0, 3]), E([15]), S(':', [3]), E([5]), E([25]), S('+', [5]), E([12])],
    solution: { S0: 0, L1: 1, R1: 2, S1: 3, R2: 4 },
    traps: [{ tile: 5, step: 0, cell: 'R1', kind: 'lig-move-sign' }],
    x: 5,
  }

  it('godkender den rigtige trappe og finder fejl i det rigtige trin', () => {
    expect(evaluateLadder(lad, lad.solution).solved).toBe(true)
    const wrong: Board = { ...lad.solution, R1: 5 }
    const r = evaluateLadder(lad, wrong)
    expect(r.equations.map((e) => e.status)).toEqual(['wrong', 'wrong'])
    expect(r.equations[0].trapHits.map((h) => h.kind)).toEqual(['lig-move-sign'])
  })

  it('har præcis én løsning med disse brikker', () => {
    expect(countLadderSolutions(lad)).toBe(1)
  })

  it('hints og prøve', () => {
    expect(ladderBlankKeys(lad)).toEqual(['S0', 'L1', 'R1', 'S1', 'R2'])
    const target = ladderHintTarget(lad, { S0: 0 })!
    expect(target.cell).toBe('L1')
    expect(ladderExplain(lad, target)[0]).toBe('Regn venstre side ud:  (3x + 5) − 5')
    expect(ladderExplain(lad, { equation: 0, cell: 'S0', single: true })[0]).toContain('+5')
    expect(ladderProof(lad)).toBe('Prøve: 3 · 5 + 5 = 20 ✓')
  })
})

describe.each(file.ladders.map((p) => [p.id, p] as const))('ligning %s', (_id, p) => {
  it('løsningen går op, og der er kun én', () => {
    expect(evaluateLadder(p, p.solution).solved).toBe(true)
    expect(countLadderSolutions(p, 2)).toBe(1)
  })

  it('x passer i den første række', () => {
    const [l, r] = [p.rows[0].left, p.rows[0].right]
    if (l.kind !== 'given' || r.kind !== 'given') throw new Error('første række skal være givet')
    expect(equals(pevalAt(tokenPoly(l.value), p.x), pevalAt(tokenPoly(r.value), p.x))).toBe(true)
    expect(ladderProof(p)).toMatch(/✓$/)
  })

  it('fælder er ikke en del af løsningen og giver den rigtige forklaring i deres felt', () => {
    const used = new Set(Object.values(p.solution))
    for (const trap of p.traps) {
      expect(used.has(trap.tile)).toBe(false)
      const result = evaluateLadder(p, { ...p.solution, [trap.cell]: trap.tile })
      expect(result.equations[trap.step].status).toBe('wrong')
      expect(result.equations[trap.step].trapHits.map((h) => h.kind)).toContain(trap.kind)
    }
  })

  it('hints virker fra et tomt bræt', () => {
    const target = ladderHintTarget(p, {})!
    expect(target.cell).toBe('S0')
    expect(ladderExplain(p, target).length).toBeGreaterThan(0)
  })

  it('tallene er hele og højst 99 – og positive på niveau 1–3', () => {
    const positive = ['L1', 'L2', 'L3'].includes(p.level)
    expect(Number.isInteger(p.x)).toBe(true)
    if (positive) expect(p.x).toBeGreaterThan(0)
    for (const t of p.tiles) {
      if (t.form !== 'expr') continue
      for (const c of t.c) expect(Math.abs(c)).toBeLessThanOrEqual(99)
      if (positive && t.c.length === 1) expect(t.c[0]).toBeGreaterThan(0)
    }
  })
})
