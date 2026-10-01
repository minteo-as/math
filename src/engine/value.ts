/**
 * Værdier i spillet: tal (brøk/decimal/procent) eller algebraiske udtryk i x.
 *
 * Internt regner tjek og løser på polynomier med brøk-koefficienter (`Poly`).
 * Et almindeligt tal er bare et polynomium af grad 0, så brøk- og procentbanerne
 * regnes præcis som før.
 */
import { add, equals, frac, mul, reduce, tokenText, type Frac, type NumToken, type Op } from './fraction'

/** Et udtryk i x med hele koefficienter: c[0] + c[1]·x + c[2]·x². */
export interface ExprToken {
  form: 'expr'
  c: number[]
}

/** Det, der står på en brik eller i et felt. */
export type Token = NumToken | ExprToken

export function isExpr(t: Token): t is ExprToken {
  return t.form === 'expr'
}

/** Koefficienter (index = potens af x), uden nuller til sidst. Nulpolynomiet er []. */
export type Poly = Frac[]

function trim(p: Poly): Poly {
  const out = p.map(reduce)
  while (out.length > 0 && out[out.length - 1].n === 0) out.pop()
  return out
}

export function pconst(f: Frac): Poly {
  return trim([f])
}

export function poly(coeffs: number[]): Poly {
  return trim(coeffs.map((c) => frac(c)))
}

export function degree(p: Poly): number {
  return p.length - 1
}

export function constOf(p: Poly): Frac {
  return p.length === 0 ? frac(0) : p[0]
}

export function padd(a: Poly, b: Poly): Poly {
  const out: Poly = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) out.push(add(a[i] ?? frac(0), b[i] ?? frac(0)))
  return trim(out)
}

export function pneg(a: Poly): Poly {
  return a.map((f) => frac(-f.n, f.d))
}

export function psub(a: Poly, b: Poly): Poly {
  return padd(a, pneg(b))
}

export function pmul(a: Poly, b: Poly): Poly {
  if (a.length === 0 || b.length === 0) return []
  const out: Poly = Array.from({ length: a.length + b.length - 1 }, () => frac(0))
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] = add(out[i + j], mul(x, y)))))
  return trim(out)
}

/** Division, der skal gå op. Returnerer null ved division med 0 eller rest. */
export function pdiv(a: Poly, b: Poly): Poly | null {
  if (b.length === 0) return null
  let rest = trim(a)
  const out: Poly = Array.from({ length: Math.max(rest.length - b.length + 1, 0) }, () => frac(0))
  const lead = b[b.length - 1]
  while (rest.length >= b.length) {
    const shift = rest.length - b.length
    const k = reduce(frac(rest[rest.length - 1].n * lead.d, rest[rest.length - 1].d * lead.n))
    out[shift] = k
    rest = psub(rest, pmul(b, [...Array.from({ length: shift }, () => frac(0)), k]))
  }
  return rest.length === 0 ? trim(out) : null
}

export function pequals(a: Poly, b: Poly): boolean {
  return a.length === b.length && a.every((f, i) => equals(f, b[i]))
}

/** Værdien, når x sættes til et tal. */
export function pevalAt(p: Poly, x: number): Frac {
  return p.reduceRight((acc, c) => add(mul(acc, frac(x)), c), frac(0))
}

/** a ∘ b – eller null, hvis det ikke kan lade sig gøre (division med 0 eller en rest). */
export function papply(op: Op, a: Poly, b: Poly): Poly | null {
  switch (op) {
    case '+':
      return padd(a, b)
    case '-':
      return psub(a, b)
    case '*':
    case 'af':
      return pmul(a, b)
    case ':':
      return pdiv(a, b)
  }
}

export function tokenPoly(t: Token): Poly {
  return isExpr(t) ? poly(t.c) : pconst(frac(t.n, t.d))
}

/** Hele koefficienter (eller null, hvis polynomiet har brøk-koefficienter). */
export function intCoeffs(p: Poly): number[] | null {
  return p.every((f) => f.d === 1) ? p.map((f) => f.n) : null
}

export function exprToken(c: number[]): ExprToken {
  const p = poly(c)
  return { form: 'expr', c: p.map((f) => f.n) }
}

/** Antal led med en koefficient forskellig fra 0. */
export function termCount(c: number[]): number {
  return c.filter((x) => x !== 0).length
}

const SUP = ['', '', '²', '³']

/**
 * Udtrykket som tekst, højeste potens først, fx "x² + 6x + 9" eller "−x + 3".
 * `compact` fjerner mellemrummene (bruges i felter og på brikker, hvor pladsen er trang).
 */
export function exprText(c: number[], compact = false): string {
  const terms: string[] = []
  for (let d = c.length - 1; d >= 0; d--) {
    const k = c[d]
    if (!k) continue
    const abs = Math.abs(k)
    const body = d === 0 ? String(abs) : `${abs === 1 ? '' : abs}x${SUP[d]}`
    terms.push((k < 0 ? '−' : '+') + body)
  }
  if (terms.length === 0) return '0'
  const sep = compact ? '' : ' '
  return terms
    .map((t, i) => (i === 0 ? (t[0] === '−' ? '−' + t.slice(1) : t.slice(1)) : `${sep}${t[0]}${sep}${t.slice(1)}`))
    .join('')
}

/** Tekst for en brik, uanset om det er et tal eller et udtryk. */
export function valueText(t: Token, compact = false): string {
  return isExpr(t) ? exprText(t.c, compact) : tokenText(t)
}

/** a + b + c → hver term for sig: [koefficient, potens], højeste potens først. */
export function terms(p: Poly): [Frac, number][] {
  const out: [Frac, number][] = []
  for (let d = p.length - 1; d >= 0; d--) if (p[d].n !== 0) out.push([p[d], d])
  return out
}

export function monomial(k: Frac, d: number): Poly {
  return trim([...Array.from({ length: d }, () => frac(0)), k])
}

