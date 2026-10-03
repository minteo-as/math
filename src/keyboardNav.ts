/**
 * Piletaster på brættet og i bunken: find det nærmeste element i en retning.
 * Elementerne gives som midtpunkter (fx fra getBoundingClientRect), så det virker
 * for både gitteret og bunken, uanset hvordan de er lagt ud.
 */
export type Direction = 'left' | 'right' | 'up' | 'down'

export const ARROW_KEYS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

export interface Point {
  x: number
  y: number
}

/**
 * Indeks på det nærmeste punkt i retningen fra `points[from]`, eller -1, hvis der ikke er noget.
 * Afstanden på tværs tæller dobbelt, så man bliver i samme række/kolonne, når det er muligt.
 */
export function nearestInDirection(points: Point[], from: number, dir: Direction): number {
  const a = points[from]
  let best = -1
  let bestScore = Infinity
  points.forEach((b, i) => {
    if (i === from) return
    const dx = b.x - a.x
    const dy = b.y - a.y
    const [along, across] =
      dir === 'left' ? [-dx, dy] : dir === 'right' ? [dx, dy] : dir === 'up' ? [-dy, dx] : [dy, dx]
    // Kun det, der ligger foran (lidt tolerance, så elementer på samme linje ikke tæller).
    if (along <= 2) return
    const score = along + 2 * Math.abs(across)
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  })
  return best
}

/** Midtpunktet af et element på skærmen. */
export function centerOf(el: Element): Point {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** Flyt fokus med en piletast mellem `elements`. Returnerer true, hvis tasten blev brugt. */
export function moveFocus(event: KeyboardEvent, elements: HTMLElement[]): boolean {
  const dir = ARROW_KEYS[event.key]
  if (!dir) return false
  const from = elements.indexOf(event.currentTarget as HTMLElement)
  if (from < 0) return false
  event.preventDefault()
  const next = nearestInDirection(elements.map(centerOf), from, dir)
  if (next >= 0) elements[next].focus()
  return true
}
