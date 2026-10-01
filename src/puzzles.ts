import data from './data/puzzles.json'
import type { Puzzle, PuzzleFile } from './engine/types'

const file = data as unknown as PuzzleFile

export const PUZZLES: Puzzle[] = file.puzzles

export function puzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id)
}

export function puzzlesForLevel(level: string): Puzzle[] {
  return PUZZLES.filter((p) => p.level === level)
}

export function nextPuzzle(p: Puzzle): Puzzle | undefined {
  return puzzlesForLevel(p.level).find((q) => q.index === p.index + 1)
}
