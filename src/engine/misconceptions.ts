import {
  add,
  equals,
  frac,
  gcd,
  isInteger,
  lcm,
  mul,
  reduce,
  sub,
  token,
  type Form,
  type Frac,
  type NumToken,
  type Op,
} from './fraction'
import type { MisconceptionKind } from './types'

/** Forklaring til eleven, når en fælde-brik er lagt i "sin" ligning. */
export const MISCONCEPTION_TEXT: Record<MisconceptionKind, string> = {
  'add-across':
    'Det ligner, at du har lagt tællerne sammen og nævnerne sammen hver for sig. Find en fællesnævner først.',
  'sub-across':
    'Det ligner, at du har trukket tællere og nævnere fra hinanden hver for sig. Find en fællesnævner først.',
  'same-den-add': 'Når nævnerne er ens, skal kun tællerne lægges sammen. Nævneren bliver den samme.',
  'numerator-not-expanded':
    'Du har fundet fællesnævneren, men glemt at forlænge tællerne med det samme tal.',
  'wrong-op': 'Tjek regnetegnet – det ligner, at du har regnet med det modsatte regnetegn.',
  'mul-whole-both': 'Når et helt tal ganges med en brøk, ganges kun tælleren – ikke nævneren.',
  'mul-cross':
    'Ved gange ganges tæller med tæller og nævner med nævner. Du skal ikke vende nogen af brøkerne.',
  'div-no-flip': 'Ved division skal du gange med den omvendte brøk. Husk at vende brøken efter : .',
  'div-flip-first': 'Du har vendt den forkerte brøk. Det er brøken EFTER : , der skal vendes.',
  'mixed-sub-parts':
    'Du kan ikke bare bytte om på brøkdelene. Veksl 1 hel til brøkdele – eller omskriv til uægte brøker først.',
  'mixed-add-whole': 'Husk at veksle: når brøkdelene tilsammen giver mere end 1, skal der 1 mere over i de hele.',
  sign: 'Tjek fortegnet.',
  'not-reduced': 'Rigtig værdi – men brøken kan forkortes.',
  improper: 'Rigtig værdi – men tallet skal skrives som et blandet tal.',
}

export interface TrapCandidate {
  value: NumToken
  kind: MisconceptionKind
}

export interface TrapOptions {
  form: Form
  negatives: boolean
  reductionTraps: boolean
  improperTraps: boolean
}

/** Hel del og brøkdel af en positiv brøk, fx 7/4 -> [1, 3/4]. */
function splitMixed(f: Frac): [number, Frac] {
  const whole = Math.floor(f.n / f.d)
  return [whole, reduce(frac(f.n - whole * f.d, f.d))]
}

/**
 * Finder de "forkerte svar", en elev typisk får i ligningen a ∘ b = c.
 * Returnerer kun kandidater, der adskiller sig fra det rigtige svar.
 */
export function trapCandidates(op: Op, a: Frac, b: Frac, c: Frac, opts: TrapOptions): TrapCandidate[] {
  const out: TrapCandidate[] = []
  const push = (f: Frac, kind: MisconceptionKind, form: Form = opts.form, keepUnreduced = false) => {
    if (f.d === 0) return
    const value = keepUnreduced ? frac(f.n, f.d) : reduce(frac(f.n, f.d))
    if (equals(value, c) && kind !== 'not-reduced' && kind !== 'improper') return
    out.push({ value: token(value, form), kind })
  }
  const bothPositive = a.n > 0 && b.n > 0

  switch (op) {
    case '+': {
      if (a.d === b.d) push(frac(a.n + b.n, a.d + b.d), 'same-den-add')
      else {
        push(frac(a.n + b.n, a.d + b.d), 'add-across')
        push(frac(a.n + b.n, lcm(a.d, b.d)), 'numerator-not-expanded')
      }
      if (opts.form === 'mixed' && bothPositive) {
        const [, fa] = splitMixed(a)
        const [, fb] = splitMixed(b)
        if (fa.n > 0 && fb.n > 0 && add(fa, fb).n > add(fa, fb).d) push(sub(c, frac(1)), 'mixed-add-whole')
      }
      push(sub(a, b), 'wrong-op')
      break
    }
    case '-': {
      if (a.d !== b.d) {
        push(frac(a.n - b.n, a.d - b.d), 'sub-across')
        push(frac(a.n - b.n, lcm(a.d, b.d)), 'numerator-not-expanded')
      }
      if (opts.form === 'mixed' && bothPositive) {
        const [wa, fa] = splitMixed(a)
        const [wb, fb] = splitMixed(b)
        // Klassisk fejl: 3 1/4 − 1 3/4 = 2 2/4, fordi man tager 3/4 − 1/4.
        if (fa.n * fb.d < fb.n * fa.d) push(add(frac(wa - wb), sub(fb, fa)), 'mixed-sub-parts')
      }
      push(add(a, b), 'wrong-op')
      break
    }
    case '*': {
      const aWhole = isInteger(a)
      const bWhole = isInteger(b)
      if (aWhole !== bWhole) {
        const k = aWhole ? a.n : b.n
        const f = aWhole ? b : a
        // 3 · 2/5 = 6/15: skrives uforkortet, for det er sådan fejlen ser ud.
        if (Math.abs(k) > 1) push(frac(k * f.n, k * f.d), 'mul-whole-both', 'frac', true)
      } else if (!aWhole && !bWhole) {
        push(frac(a.n * b.d, a.d * b.n), 'mul-cross')
      }
      break
    }
    case ':': {
      push(mul(a, b), 'div-no-flip')
      if (c.n !== 0) push(frac(c.d, c.n), 'div-flip-first')
      break
    }
  }

  if (opts.negatives && c.n !== 0) push(frac(-c.n, c.d), 'sign')

  if (opts.reductionTraps && !isInteger(c)) {
    const k = c.d <= 6 ? 2 : 3
    push(frac(c.n * k, c.d * k), 'not-reduced', opts.form, true)
  }

  if (opts.improperTraps && Math.abs(c.n) > c.d && !isInteger(c)) {
    push(c, 'improper', 'frac')
  }

  // Samme brik må kun optræde én gang som kandidat.
  const seen = new Set<string>()
  return out.filter((t) => {
    const key = `${t.value.n}/${t.value.d}/${t.value.form}`
    if (seen.has(key) || gcd(t.value.n, t.value.d) === 0) return false
    seen.add(key)
    return true
  })
}
