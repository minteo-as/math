import data from './data/puzzles.json'
import type { LadderPuzzle, Puzzle, PuzzleFile } from './engine/types'

const file = data as unknown as PuzzleFile

/** Krydsbanerne (alle emner undtagen ligninger). */
export const PUZZLES: Puzzle[] = file.puzzles
/** Ligningstrapperne. */
export const LADDERS: LadderPuzzle[] = file.ladders

/** En bane af den ene eller den anden slags. */
export type GamePuzzle = Puzzle | LadderPuzzle

export function isLadder(p: GamePuzzle): p is LadderPuzzle {
  return p.kind === 'ladder'
}

export function puzzleById(id: string): GamePuzzle | undefined {
  return PUZZLES.find((p) => p.id === id) ?? LADDERS.find((p) => p.id === id)
}

export function puzzlesForLevel(level: string): GamePuzzle[] {
  const cross = PUZZLES.filter((p) => p.level === level)
  return cross.length > 0 ? cross : LADDERS.filter((p) => p.level === level)
}

export function nextPuzzle(p: GamePuzzle): GamePuzzle | undefined {
  return puzzlesForLevel(p.level).find((q) => q.index === p.index + 1)
}
