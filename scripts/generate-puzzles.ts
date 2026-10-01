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
import { levelInfo } from '../src/engine/levels'
import type { PuzzleFile } from '../src/engine/types'

const PUZZLES_PER_LEVEL = 20
const SEED = 2026

/**
 * Hvert niveau får sit eget seed. Brøkniveauerne ("1"–"5") bruger deres nummer,
 * så deres baner ikke ændrer sig, når der kommer nye emner til.
 * Andre emner lægges fra 10 og op (P1 -> 11 osv.).
 */
function seedIndex(code: string): number {
  const info = levelInfo(code)
  const offset: Record<string, number> = { broek: 0, procent: 10, algebra: 20 }
  return offset[info.topic] + info.number
}

const file: PuzzleFile = { version: 1, puzzles: [] }
const jobs = [
  ...generatorLevels().map((code) => ({ code, make: generateLevel })),
  ...algebraLevels().map((code) => ({ code, make: generateAlgebraLevel })),
]
for (const { code, make } of jobs) {
  const start = Date.now()
  const puzzles = make(code, PUZZLES_PER_LEVEL, SEED * 1000 + seedIndex(code) * 100_000)
  file.puzzles.push(...puzzles)
  console.log(`Niveau ${code}: ${puzzles.length} baner (${Date.now() - start} ms)`)
}

const out = fileURLToPath(new URL('../src/data/puzzles.json', import.meta.url))
writeFileSync(out, JSON.stringify(file) + '\n')
console.log(`Gemt i ${out}`)
