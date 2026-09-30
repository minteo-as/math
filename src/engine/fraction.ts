/**
 * Brøkregning med heltal.
 *
 * En `Frac` er en brøk n/d, hvor d altid er positiv. Den er IKKE nødvendigvis
 * forkortet – det er vigtigt, fordi spillet skal kunne vise uforkortede brøker
 * (fx fælde-brikken 2/4) og skelne dem fra den forkortede form.
 */
export interface Frac {
  n: number
  d: number
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b)
}

export function frac(n: number, d = 1): Frac {
  if (d === 0) throw new Error('Nævneren må ikke være 0')
  if (d < 0) return { n: -n, d: -d }
  return { n, d }
}

export function reduce(f: Frac): Frac {
  const g = gcd(f.n, f.d) || 1
  return { n: f.n / g, d: f.d / g }
}

export function isReduced(f: Frac): boolean {
  return gcd(f.n, f.d) === 1
}

export function add(a: Frac, b: Frac): Frac {
  return reduce(frac(a.n * b.d + b.n * a.d, a.d * b.d))
}

export function sub(a: Frac, b: Frac): Frac {
  return reduce(frac(a.n * b.d - b.n * a.d, a.d * b.d))
}

export function mul(a: Frac, b: Frac): Frac {
  return reduce(frac(a.n * b.n, a.d * b.d))
}

export function div(a: Frac, b: Frac): Frac {
  if (b.n === 0) throw new Error('Division med 0')
  return reduce(frac(a.n * b.d, a.d * b.n))
}

export function equals(a: Frac, b: Frac): boolean {
  return a.n * b.d === b.n * a.d
}

export function isInteger(f: Frac): boolean {
  return f.n % f.d === 0
}

export function toNumber(f: Frac): number {
  return f.n / f.d
}

export type Op = '+' | '-' | '*' | ':'

export function apply(op: Op, a: Frac, b: Frac): Frac {
  switch (op) {
    case '+':
      return add(a, b)
    case '-':
      return sub(a, b)
    case '*':
      return mul(a, b)
    case ':':
      return div(a, b)
  }
}

/** Tegnet som vist i en dansk matematikbog. */
export const OP_SYMBOL: Record<Op, string> = {
  '+': '+',
  '-': '−',
  '*': '·',
  ':': ':',
}

/**
 * Skriveform for et tal på en brik eller i et felt.
 *  - 'frac':  uægte brøk, fx 7/4
 *  - 'mixed': blandet tal, fx 1 3/4 (kun relevant når |værdi| > 1)
 */
export type Form = 'frac' | 'mixed'

/** Et tal præcis som det står skrevet – værdi plus skriveform. */
export interface NumToken {
  n: number
  d: number
  form: Form
}

export function token(f: Frac, form: Form = 'frac'): NumToken {
  const t = frac(f.n, f.d)
  // Et blandet tal giver kun mening, når der både er en hel del og en brøkdel.
  const mixedPossible = Math.abs(t.n) > t.d && !isInteger(t)
  return { n: t.n, d: t.d, form: form === 'mixed' && mixedPossible ? 'mixed' : 'frac' }
}

/** Opdeling til visning: fortegn, hel del og brøkdel. */
export interface TokenParts {
  negative: boolean
  whole: number | null
  num: number | null
  den: number | null
}

export function parts(t: NumToken): TokenParts {
  const negative = t.n < 0
  const n = Math.abs(t.n)
  if (n % t.d === 0 && t.d === 1) return { negative, whole: n, num: null, den: null }
  if (t.form === 'mixed' && n > t.d) {
    return { negative, whole: Math.floor(n / t.d), num: n % t.d, den: t.d }
  }
  return { negative, whole: null, num: n, den: t.d }
}

/** Tekstform, fx "−1 3/4", "5/6" eller "3". Bruges i hints og som nøgle. */
export function tokenText(t: NumToken): string {
  const p = parts(t)
  const sign = p.negative ? '−' : ''
  if (p.num === null) return `${sign}${p.whole}`
  if (p.whole === null) return `${sign}${p.num}/${p.den}`
  return `${sign}${p.whole} ${p.num}/${p.den}`
}

export function fracText(f: Frac, form: Form = 'frac'): string {
  return tokenText(token(f, form))
}
