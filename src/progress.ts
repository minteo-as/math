import { reactive } from 'vue'

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
    if (raw) return { stars: sanitize(JSON.parse(raw)?.stars) }
  } catch {
    // ignorer – start forfra
  }
  return { stars: {} }
}

export const progress = reactive<Progress>(load())

export function recordStars(puzzleId: string, stars: number) {
  if ((progress.stars[puzzleId] ?? 0) >= stars) return
  progress.stars[puzzleId] = stars
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // ignorer
  }
}

export function starsOf(puzzleId: string): number {
  return progress.stars[puzzleId] ?? 0
}
