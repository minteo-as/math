import { reactive } from 'vue'

/**
 * Elevens stjerner – gemt i browserens localStorage.
 * Der er ingen login og ingen server: data forlader aldrig elevens enhed.
 * Hvis localStorage ikke er tilgængelig (privat vindue, blokeret), virker
 * spillet stadig – stjernerne bliver bare ikke husket.
 */
const KEY = 'broekkryds.progress.v1'

interface Progress {
  stars: Record<string, number>
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.stars === 'object') return { stars: parsed.stars }
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
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // ignorer
  }
}

export function starsOf(puzzleId: string): number {
  return progress.stars[puzzleId] ?? 0
}
