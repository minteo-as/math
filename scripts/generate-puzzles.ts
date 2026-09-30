/**
 * Laver alle baner og gemmer dem i src/data/puzzles.json.
 * Kør med:  npm run generate
 *
 * Generatoren er deterministisk: samme seed giver samme baner.
 * Ændr PUZZLES_PER_LEVEL eller SEED for at få andre/flere baner.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { generateLevel, generatorLevels } from '../src/engine/generator'
import type { PuzzleFile } from '../src/engine/types'

const PUZZLES_PER_LEVEL = 20
const SEED = 2026

const file: PuzzleFile = { version: 1, puzzles: [] }
for (const level of generatorLevels()) {
  const start = Date.now()
  const puzzles = generateLevel(level, PUZZLES_PER_LEVEL, SEED * 1000 + level * 100_000)
  file.puzzles.push(...puzzles)
  console.log(`Niveau ${level}: ${puzzles.length} baner (${Date.now() - start} ms)`)
}

const out = fileURLToPath(new URL('../src/data/puzzles.json', import.meta.url))
writeFileSync(out, JSON.stringify(file) + '\n')
console.log(`Gemt i ${out}`)
