import { describe, expect, it } from 'vitest'
import data from '../data/puzzles.json'
import { evaluateBoard, formIssue, type Board } from './evaluate'
import { layoutOf } from './generator'
import { explainSteps, findHintTarget } from './hints'
import { levelInfo } from './levels'
import { deductionOrder, findSolutions } from './solver'
import { TEMPLATES } from './templates'
import type { PuzzleFile } from './types'

const file = data as unknown as PuzzleFile

describe('skabeloner', () => {
  it.each(Object.values(TEMPLATES))('$name er gyldig og højst 7 kolonner bred', (t) => {
    const layout = layoutOf(t)
    expect(layout.cols).toBeLessThanOrEqual(7)
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
    for (const tile of Object.values(puzzle.solutions[0])) expect(formIssue(puzzle.tiles[tile], level)).toBeNull()
  })

  it('fælder er ikke en del af løsningen og peger på et felt i deres ligning', () => {
    const used = new Set(Object.values(puzzle.solutions[0]))
    for (const trap of puzzle.traps) {
      expect(used.has(trap.tile)).toBe(false)
      expect(puzzle.equations[trap.equation].nums).toContain(trap.cell)
    }
  })

  it('en fælde i sit felt giver den rigtige forklaring', () => {
    for (const trap of puzzle.traps) {
      const board: Board = { ...puzzle.solutions[0], [trap.cell]: trap.tile }
      const result = evaluateBoard(puzzle, board, level)
      const eq = result.equations[trap.equation]
      if (level.reduce === 'nudge' && trap.kind === 'not-reduced') {
        expect(eq.status).toBe('ok')
        expect(eq.formIssues[0]?.kind).toBe('not-reduced')
      } else {
        expect(eq.status).toBe('wrong')
        const expected = trap.kind === 'improper' || trap.kind === 'not-reduced' ? eq.formIssues : eq.trapHits
        expect(expected.map((h) => h.kind)).toContain(trap.kind)
      }
    }
  })

  it('kan løses skridt for skridt (niveau 1-4)', () => {
    if (puzzle.level <= 4) expect(deductionOrder(puzzle)).not.toBeNull()
  })

  it('hints virker fra et tomt bræt', () => {
    const target = findHintTarget(puzzle, {})
    expect(target).not.toBeNull()
    expect(explainSteps(puzzle, target!, level).length).toBeGreaterThan(0)
  })
})
