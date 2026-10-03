import { reactive } from 'vue'
import { PUZZLES } from './puzzles'

/**
 * Elevens stjerner – gemt i browserens localStorage.
 * Der er ingen login og ingen server: data forlader aldrig elevens enhed.
 * Hvis localStorage ikke er tilgængelig (privat vindue, blokeret), virker
 * spillet stadig – stjernerne bliver bare ikke husket.
 */
// Nøglen hedder stadig "broekkryds" fra spillets første navn. Den må ikke ændres,
// for så mister eleverne de stjerner, de allerede har gemt.
const KEY = 'broekkryds.progress.v1'

interface Progress {
  stars: Record<string, number>
}

/**
 * Version 2 (spillets version 0.5): banerne i hvert niveau er sorteret fra let til svær, så
 * mange baner har fået et nyt nummer. Stjerner gemt før det flyttes med over på samme bane
 * (via formerId). De 9 baner på brøk 5, der er skiftet ud med nye, mister deres stjerner.
 */
const VERSION = 2
const REPLACED_IN_V2 = new Set(['5-01', '5-03', '5-05', '5-06', '5-07', '5-11', '5-12', '5-14', '5-20'])

function migrateV1(stars: Record<string, number>): Record<string, number> {
  const moved: Record<string, number> = {}
  for (const p of PUZZLES) {
    if (!p.formerId || REPLACED_IN_V2.has(p.formerId)) continue
    const old = stars[p.formerId]
    if (old) moved[p.id] = old
  }
  return moved
}

function save(stars: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ stars, v: VERSION }))
  } catch {
    // ignorer
  }
}

/** Behold kun gyldige poster: { "3-07": 1..3 }. Alt andet ignoreres. */
function sanitize(stars: unknown): Record<string, number> {
  if (typeof stars !== 'object' || stars === null || Array.isArray(stars)) return {}
  const clean: Record<string, number> = {}
  for (const [id, value] of Object.entries(stars)) {
    if (Number.isInteger(value) && value >= 1 && value <= 3) clean[id] = value
  }
  return clean
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const data = JSON.parse(raw)
      const stars = sanitize(data?.stars)
      if (data?.v === VERSION) return { stars }
      // Gemt af en ældre version: flyt stjernerne over på de nye bane-numre.
      const moved = migrateV1(stars)
      save(moved)
      return { stars: moved }
    }
  } catch {
    // ignorer – start forfra
  }
  return { stars: {} }
}

export const progress = reactive<Progress>(load())

export function recordStars(puzzleId: string, stars: number) {
  if ((progress.stars[puzzleId] ?? 0) >= stars) return
  progress.stars[puzzleId] = stars
  save(progress.stars)
}

export function starsOf(puzzleId: string): number {
  return progress.stars[puzzleId] ?? 0
}
