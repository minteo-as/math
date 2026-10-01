import { describe, expect, it } from 'vitest'
import data from '../data/puzzles.json'
import { cellMap, evaluateBoard, expectedForm, formIssue, type Board } from './evaluate'
import { layoutOf } from './generator'
import { explainSteps, findHintTarget, substitutionHint } from './hints'
import { levelInfo } from './levels'
import { deductionOrder, findSolutions } from './solver'
import { pequals, pevalAt, tokenPoly, valueText } from './value'
import { equals } from './fraction'
import { equationCells, TEMPLATES, WIDE_TEMPLATES } from './templates'
import type { PuzzleFile } from './types'

const file = data as unknown as PuzzleFile

describe('skabeloner', () => {
  it.each(Object.values(TEMPLATES))('$name er gyldig og ikke for bred', (t) => {
    const layout = layoutOf(t)
    expect(layout.cols).toBeLessThanOrEqual(WIDE_TEMPLATES.includes(t.name) ? 9 : 7)
    // Gitteret gør ulige kolonner/rækker smalle – de må kun indeholde regnetegn og =.
    for (const eq of t.equations) expect([eq.r % 2, eq.c % 2]).toEqual([0, 0])
  })

  it.each(Object.values(TEMPLATES))('$name: ingen ligning løber sammen med en anden', (t) => {
    const layout = layoutOf(t)
    for (const eq of t.equations) {
      const cells = equationCells(eq)
      const [dr, dc] = eq.dir === 'h' ? [0, 1] : [1, 0]
      const before = `${cells[0][0] - dr},${cells[0][1] - dc}`
      const after = `${cells[4][0] + dr},${cells[4][1] + dc}`
      expect(layout.kinds.has(before)).toBe(false)
      expect(layout.kinds.has(after)).toBe(false)
    }
  })
})

describe.each(file.puzzles.map((p) => [p.id, p] as const))('bane %s', (_id, puzzle) => {
  const level = levelInfo(puzzle.level)

  it('løsningen får alle ligninger til at gå op', () => {
    const result = evaluateBoard(puzzle, puzzle.solutions[0], level)
    expect(result.solved).toBe(true)
  })

  it('har præcis én løsning', () => {
    expect(findSolutions(puzzle, level, 2)).toHaveLength(1)
  })

  it('løsningens brikker står på den rigtige form', () => {
    const cells = cellMap(puzzle)
    for (const [key, tile] of Object.entries(puzzle.solutions[0])) {
      expect(formIssue(puzzle.tiles[tile], level, expectedForm(cells.get(key)))).toBeNull()
    }
  })

  it('fælder er ikke en del af løsningen og peger på et felt i deres ligning', () => {
    const used = new Set(Object.values(puzzle.solutions[0]))
    for (const trap of puzzle.traps) {
      expect(used.has(trap.tile)).toBe(false)
      expect(puzzle.equations[trap.equation].nums).toContain(trap.cell)
    }
  })

  it('en fælde i sit felt giver den rigtige forklaring', () => {
    const formKinds = ['improper', 'not-reduced', 'as-percent', 'as-decimal']
    for (const trap of puzzle.traps) {
      const board: Board = { ...puzzle.solutions[0], [trap.cell]: trap.tile }
      const result = evaluateBoard(puzzle, board, level)
      const eq = result.equations[trap.equation]
      if (level.reduce === 'nudge' && trap.kind === 'not-reduced') {
        expect(eq.status).toBe('ok')
        expect(eq.formIssues[0]?.kind).toBe('not-reduced')
      } else {
        expect(eq.status).toBe('wrong')
        const expected = formKinds.includes(trap.kind) ? eq.formIssues : eq.trapHits
        expect(expected.map((h) => h.kind)).toContain(trap.kind)
      }
    }
  })

  it('kan løses skridt for skridt, hvis niveauet lover det', () => {
    if (level.stepwise) expect(deductionOrder(puzzle)).not.toBeNull()
  })

  it('alle tal kan vises (decimaltal skal ende)', () => {
    for (const t of puzzle.tiles) expect(() => valueText(t)).not.toThrow()
    for (const c of puzzle.cells) if (c.kind === 'given') expect(() => valueText(c.value)).not.toThrow()
  })

  it('krævet skriveform: på decimalniveauer har alle tomme felter en form', () => {
    const blanks = puzzle.cells.filter((c) => c.kind === 'blank')
    if (level.form === 'dec') expect(blanks.every((c) => c.kind === 'blank' && c.form)).toBe(true)
    else expect(blanks.some((c) => c.kind === 'blank' && c.form)).toBe(false)
  })

  it('"Indsæt et tal" kan skelne den rigtige brik fra de andre (algebra)', () => {
    if (level.form !== 'expr') return
    const target = findHintTarget(puzzle, {})!
    const eq = puzzle.equations[target.equation]
    const correct = tokenPoly(puzzle.tiles[puzzle.solutions[0][target.cell]])
    const lines = substitutionHint(puzzle, target)
    const x = Number(/x = (\d+)/.exec(lines[0])![1])
    const v = pevalAt(correct, x)
    for (const t of puzzle.tiles) {
      const tp = tokenPoly(t)
      if (!pequals(tp, correct)) expect(equals(pevalAt(tp, x), v)).toBe(false)
    }
    expect(eq.nums).toContain(target.cell)
  })

  it('hele tal: alle tal er hele, højst 99 i talværdi og kun negative fra niveau 4', () => {
    if (level.topic !== 'hele') return
    const negatives = level.number >= 4
    const values = [...puzzle.tiles, ...puzzle.cells.flatMap((c) => (c.kind === 'given' ? [c.value] : []))]
    for (const t of values) {
      expect(t.form).toBe('frac')
      if (t.form === 'expr') continue
      expect(t.d).toBe(1)
      expect(Math.abs(t.n)).toBeGreaterThanOrEqual(2)
      expect(Math.abs(t.n)).toBeLessThanOrEqual(99)
      if (!negatives) expect(t.n).toBeGreaterThan(0)
    }
  })

  it('hints virker fra et tomt bræt', () => {
    const target = findHintTarget(puzzle, {})
    expect(target).not.toBeNull()
    expect(explainSteps(puzzle, target!, level).length).toBeGreaterThan(0)
  })
})
