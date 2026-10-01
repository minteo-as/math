/**
 * Layout-skabeloner: hvor ligningerne ligger i gitteret.
 * Hver ligning fylder 5 felter: tal, regnetegn, tal, =, tal.
 * Ligninger må kun krydse hinanden i et tal-felt (position 0, 2 eller 4).
 * Højst 7 kolonner til brøker, så de kan læses på en telefon. Hele tal fylder mindre,
 * så de store skabeloner (tower, wide, zigzag) må være op til 9 kolonner brede.
 */
export interface TemplateEquation {
  r: number
  c: number
  dir: 'h' | 'v'
}

export interface Template {
  name: string
  equations: TemplateEquation[]
}

const h = (r: number, c: number): TemplateEquation => ({ r, c, dir: 'h' })
const v = (r: number, c: number): TemplateEquation => ({ r, c, dir: 'v' })

export const TEMPLATES: Record<string, Template> = {
  // ┌─┐
  // │ │
  pi: { name: 'pi', equations: [h(0, 0), v(0, 0), v(0, 4)] },
  // ─┬─
  //  │
  // ─┴─
  beam: { name: 'beam', equations: [h(0, 0), v(0, 2), h(4, 0)] },
  // │ │
  // ├─┤
  // │ │
  hshape: { name: 'hshape', equations: [v(0, 0), v(0, 4), h(2, 0)] },
  // ──┐
  //   ├──
  zig: { name: 'zig', equations: [h(0, 0), v(0, 4), h(4, 2)] },
  // ┌─┐
  // └─┘
  square: { name: 'square', equations: [h(0, 0), h(4, 0), v(0, 0), v(0, 4)] },
  // firkant med en hale nedad
  kite: { name: 'kite', equations: [h(0, 0), h(4, 0), v(0, 0), v(0, 4), v(4, 2)] },
  // firkant med hale og fod
  anchor: { name: 'anchor', equations: [h(0, 0), h(4, 0), v(0, 0), v(0, 4), v(4, 2), h(8, 0)] },
  // trappe
  stairs: { name: 'stairs', equations: [h(0, 0), v(0, 4), h(4, 2), v(4, 6)] },
  // slange
  snake: { name: 'snake', equations: [h(0, 0), v(0, 4), h(4, 2), v(4, 6), h(8, 2)] },
  // firkant med en trappe nedad (8 ligninger)
  tower: {
    name: 'tower',
    equations: [h(0, 0), h(4, 0), v(0, 0), v(0, 4), v(4, 2), h(8, 2), v(8, 6), h(12, 2)],
  },
  // to firkanter ved siden af hinanden med en hale (7 ligninger, 9 kolonner)
  wide: { name: 'wide', equations: [h(0, 0), v(0, 0), v(0, 4), h(4, 4), v(0, 8), v(4, 6), h(8, 2)] },
  // zigzag ned over brættet (9 ligninger, 9 kolonner)
  zigzag: {
    name: 'zigzag',
    equations: [h(0, 0), v(0, 0), v(0, 4), h(4, 4), v(4, 8), h(8, 4), v(8, 4), v(8, 0), h(12, 0)],
  },
}

/** Skabeloner, der kun bruges med hele tal (for brede til brøker). */
export const WIDE_TEMPLATES = ['wide', 'zigzag']

/** Felterne i en ligning i rækkefølge: a, op, b, =, c. */
export function equationCells(eq: TemplateEquation): [number, number][] {
  return [0, 1, 2, 3, 4].map((i) => (eq.dir === 'h' ? [eq.r, eq.c + i] : [eq.r + i, eq.c]))
}
