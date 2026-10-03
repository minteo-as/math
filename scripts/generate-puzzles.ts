/**
 * Laver alle baner og gemmer dem i src/data/puzzles.json.
 * Kør med:  npm run generate
 *
 * Generatoren er deterministisk: samme seed giver samme baner.
 * Ændr PUZZLES_PER_LEVEL eller SEED for at få andre/flere baner.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { algebraLevels, generateAlgebraLevel } from '../src/engine/algebraGenerator'
import { generateLevel, generatorLevels } from '../src/engine/generator'
import { difficulty } from '../src/engine/difficulty'
import { ladderDifficulty } from '../src/engine/ladder'
import { generateLadderLevel, ladderLevels } from '../src/engine/ladderGenerator'
import { levelInfo } from '../src/engine/levels'
import type { LadderPuzzle, Puzzle, PuzzleFile } from '../src/engine/types'

const PUZZLES_PER_LEVEL = 20
const SEED = 2026

/**
 * Hvert niveau får sit eget seed. Brøkniveauerne ("1"–"5") bruger deres nummer,
 * så deres baner ikke ændrer sig, når der kommer nye emner til.
 * Andre emner lægges fra 10 og op (P1 -> 11, A1 -> 21, H1 -> 31).
 */
function seedIndex(code: string): number {
  const info = levelInfo(code)
  const offset: Record<string, number> = { broek: 0, procent: 10, algebra: 20, hele: 30, ligninger: 40 }
  return offset[info.topic] + info.number
}

/**
 * Banerne i et niveau kommer i rækkefølge fra let til svær (se difficulty.ts).
 * Generatorens egen rækkefølge gemmes i formerId, så gamle stjerner kan flyttes med.
 */
function sortByDifficulty<T extends Puzzle | LadderPuzzle>(puzzles: T[], score: (p: T) => number): T[] {
  const scored = puzzles.map((p, i) => ({ p, i, score: score(p) }))
  scored.sort((a, b) => a.score - b.score || a.i - b.i)
  return scored.map(({ p }, i) => {
    const index = i + 1
    const id = `${p.level}-${String(index).padStart(2, '0')}`
    // Felterne i samme rækkefølge som før, med formerId lige efter id.
    const { id: formerId, index: _old, ...rest } = p
    return { id, formerId, index, ...rest } as unknown as T
  })
}

const file: PuzzleFile = { version: 1, puzzles: [], ladders: [] }
const jobs = [
  ...generatorLevels().map((code) => ({ code, make: generateLevel })),
  ...algebraLevels().map((code) => ({ code, make: generateAlgebraLevel })),
]
for (const { code, make } of jobs) {
  const start = Date.now()
  const generated = make(code, PUZZLES_PER_LEVEL, SEED * 1000 + seedIndex(code) * 100_000)
  file.puzzles.push(...sortByDifficulty(generated, (p) => difficulty(p).score))
  console.log(`Niveau ${code}: ${generated.length} baner (${Date.now() - start} ms)`)
}

for (const code of ladderLevels()) {
  const start = Date.now()
  const generated = generateLadderLevel(code, PUZZLES_PER_LEVEL, SEED * 1000 + seedIndex(code) * 100_000)
  file.ladders.push(...sortByDifficulty(generated, ladderDifficulty))
  console.log(`Niveau ${code}: ${generated.length} ligninger (${Date.now() - start} ms)`)
}

const out = fileURLToPath(new URL('../src/data/puzzles.json', import.meta.url))
writeFileSync(out, JSON.stringify(file) + '\n')
console.log(`Gemt i ${out}`)
