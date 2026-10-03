import { describe, expect, it } from 'vitest'
import data from './data/puzzles.json'
import type { PuzzleFile } from './engine/types'
import { nearestInDirection, type Point } from './keyboardNav'

const file = data as unknown as PuzzleFile

// Et lille bræt:   0 . 1
//                  .   .
//                  2 . 3 . 4
const p = (x: number, y: number): Point => ({ x, y })
const board = [p(0, 0), p(100, 0), p(0, 100), p(100, 100), p(200, 100)]

describe('piletaster', () => {
  it('går til nabofeltet i samme række eller kolonne', () => {
    expect(nearestInDirection(board, 0, 'right')).toBe(1)
    expect(nearestInDirection(board, 0, 'down')).toBe(2)
    expect(nearestInDirection(board, 3, 'right')).toBe(4)
    expect(nearestInDirection(board, 4, 'left')).toBe(3)
    expect(nearestInDirection(board, 3, 'up')).toBe(1)
  })

  it('springer over huller i gitteret', () => {
    // Fra 1 og op/til højre er der ingenting.
    expect(nearestInDirection(board, 1, 'up')).toBe(-1)
    expect(nearestInDirection(board, 1, 'right')).toBe(4)
  })

  it('foretrækker samme række frem for et skråt felt tættere på', () => {
    const pts = [p(0, 0), p(60, 50), p(150, 0)]
    expect(nearestInDirection(pts, 0, 'right')).toBe(2)
  })

  it('går til nærmeste felt på skrå, hvis der ikke er noget lige ud', () => {
    expect(nearestInDirection(board, 4, 'up')).toBe(1)
  })
})

describe('alle felter kan nås med piletasterne', () => {
  it.each(file.puzzles.map((p) => [p.id, p] as const))('bane %s', (_id, puzzle) => {
    // Midtpunkter som i gitteret: tal-kolonner/-rækker er 1 bred, regnetegn 0,62.
    const pos = (i: number) => Math.floor(i / 2) * 1.62 + (i % 2 === 0 ? 0.5 : 1.31)
    const blanks = puzzle.cells.filter((c) => c.kind === 'blank')
    const points = blanks.map((c) => p(pos(c.c) * 50, pos(c.r) * 50))
    const seen = new Set([0])
    const queue = [0]
    while (queue.length) {
      const from = queue.shift()!
      for (const dir of ['left', 'right', 'up', 'down'] as const) {
        const next = nearestInDirection(points, from, dir)
        if (next >= 0 && !seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    expect(seen.size).toBe(blanks.length)
  })
})
