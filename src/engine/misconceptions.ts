import {
  add,
  decimals,
  div,
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
  'as-percent': 'Rigtig værdi – men her skal tallet skrives i procent.',
  'as-decimal': 'Rigtig værdi – men her skal tallet skrives som decimaltal.',
  'dec-align':
    'Det ligner, at tallene ikke står med komma under komma. Tiendedele skal regnes sammen med tiendedele og hundrededele med hundrededele.',
  'dec-comma': 'Cifrene er rigtige, men kommaet står forkert. Tjek, hvor mange decimaler svaret skal have.',
  'pct-add': 'Du har lagt procenttallet til. "25 % af 80" betyder 0,25 · 80.',
  'pct-divide': 'Du har divideret med procenttallet. "25 % af 80" betyder 0,25 · 80.',
  'pct-no-100': 'Delen divideret med det hele giver et decimaltal. Det skal ganges med 100 for at blive til procent.',
  'pct-flip': 'Du har divideret det hele med delen. Procenten er delen divideret med det hele.',
  'pct-mul-instead': 'For at finde det hele skal du dividere med procenten (fx 20 : 0,25) – ikke gange.',
  'alg-add-exponents':
    'Når ensartede led lægges sammen eller trækkes fra, ændrer potensen sig ikke: 2x + 3x = 5x – ikke 5x².',
  'alg-unlike': 'Kun ensartede led kan samles. x²-led, x-led og tal skal holdes hver for sig.',
  'alg-minus-paren': 'Står der minus foran en parentes, skal fortegnet skiftes på ALLE led i parentesen.',
  'alg-mul-degree': 'x · x = x². Husk at gange både tallene og x’erne.',
  'alg-mul-add-coef': 'Tallene foran skal ganges, ikke lægges sammen: 2x · 3x = 6x².',
  'alg-distribute-first': 'Når du ganger ind i en parentes, skal du gange med hvert led i parentesen.',
  'alg-foil-cross':
    'Hvert led i den ene parentes skal ganges med hvert led i den anden. Du mangler leddet i midten – fx det dobbelte produkt i (a + b)² = a² + 2ab + b².',
  'alg-conj-sign': '(a + b)(a − b) = a² − b². Det sidste led får minus.',
  'alg-div-degree': 'x² : x = x. Husk at dividere både tallene og x’erne.',
  'alg-divide-first': 'Når et udtryk med flere led divideres, skal hvert led divideres.',
  'int-carry': 'Husk menten: når enerne tilsammen giver 10 eller mere, skal der 1 over til tierne.',
  'int-borrow':
    'Du kan ikke bare tage det mindste ciffer fra det største. Er der for få enere, skal du låne 1 tier (10 enere).',
  'int-table': 'Tjek gangetabellen – svaret ligner tallet lige ved siden af i tabellen.',
  'int-div-table': 'Tjek med gange: svaret ganget med det tal, du dividerer med, skal give tallet foran : .',
  'int-neg-add':
    'Når fortegnene er forskellige, skal talværdierne trækkes fra hinanden – ikke lægges sammen. Fx −3 + 5 = 2.',
  'int-neg-sub': 'Når du trækker fra, går du længere ned ad tallinjen – også når du starter under 0: −3 − 5 = −8.',
  'int-minus-neg': 'At trække et negativt tal fra er det samme som at lægge til: 4 − (−3) = 4 + 3 = 7.',
  'int-sign-mul':
    'Tjek fortegnet: plus gange minus giver minus, og minus gange minus giver plus. Det samme gælder ved division.',
  'lig-sign-op': 'Gør det modsatte: står der +5 sammen med x, skal du trække 5 fra – og står der −5, skal du lægge 5 til.',
  'lig-move-sign':
    'Når et tal "flyttes over" på den anden side, skifter det fortegn – for du trækker det fra (eller lægger det til) på begge sider.',
  'lig-sub-coef': '3x betyder 3 · x. Det modsatte af at gange med 3 er at dividere med 3 – ikke at trække 3 fra.',
  'lig-mul-instead': 'Du har ganget, hvor du skulle dividere. Det modsatte af · 3 er : 3.',
  'lig-div-instead': 'Du har divideret, hvor du skulle gange. Det modsatte af : 3 er · 3.',
  'lig-one-side': 'Det, du gør, skal gøres på begge sider af lighedstegnet – også på den side, hvor der ikke står x.',
  'lig-x-sign': 'For at fjerne 2x skal du trække 2x fra – på begge sider. Lægger du 2x til, bliver der flere x’er.',
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
  /** Hele tal: fejl med mente, lån, tabeller og fortegn i stedet for brøkfejl. */
  integer?: boolean
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
  if (opts.integer) return integerTrapCandidates(op, a.n, b.n, c.n, opts.negatives)
  if (opts.form === 'dec') return decimalTrapCandidates(op, a, b, c)
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

/**
 * Typiske fejl med hele tal i p ∘ q = c (alle tal er hele og højst 99 i talværdi).
 * Rækkefølgen betyder noget: giver to fejl samme tal, beholdes den første forklaring.
 */
export function integerTrapCandidates(op: Op, p: number, q: number, c: number, negatives: boolean): TrapCandidate[] {
  const out: TrapCandidate[] = []
  const push = (v: number, kind: MisconceptionKind) => {
    if (v === c || v === 0 || Math.abs(v) > 99 || (!negatives && v < 0)) return
    if (out.some((o) => o.value.n === v)) return
    out.push({ value: token(frac(v)), kind })
  }
  const positive = p > 0 && q > 0
  const sign = (n: number) => (n < 0 ? -1 : 1)
  switch (op) {
    case '+':
      // 47 + 38 = 75: menten er glemt.
      if (positive && (p % 10) + (q % 10) >= 10) push(c - 10, 'int-carry')
      // −3 + 5 = −8: talværdierne er lagt sammen, selvom fortegnene er forskellige.
      if (sign(p) !== sign(q)) push(sign(p) * (Math.abs(p) + Math.abs(q)), 'int-neg-add')
      push(p - q, 'wrong-op')
      break
    case '-':
      // 52 − 27 = 35: det mindste ciffer er trukket fra det største i hver kolonne.
      if (positive && p > q && p % 10 < q % 10) {
        push(10 * (Math.floor(p / 10) - Math.floor(q / 10)) + (q % 10) - (p % 10), 'int-borrow')
      }
      // 4 − (−3) = 1: minus minus er ikke blevet til plus.
      if (q < 0) push(p + q, 'int-minus-neg')
      // −3 − 5 = 2: gået op ad tallinjen i stedet for ned.
      if (p < 0 && q > 0) push(p + q, 'int-neg-sub')
      push(p + q, 'wrong-op')
      break
    case '*':
      // 7 · 8 = 48 eller 63: nabotallet i tabellen.
      for (const k of [q, p]) {
        push(sign(c) * (Math.abs(c) + Math.abs(k)), 'int-table')
        push(sign(c) * (Math.abs(c) - Math.abs(k)), 'int-table')
      }
      break
    case ':':
      push(sign(c) * (Math.abs(c) + 1), 'int-div-table')
      push(sign(c) * (Math.abs(c) - 1), 'int-div-table')
      break
  }
  // 5 − 8 = 3 eller −4 · 6 = 24: fortegnet er glemt.
  if (negatives && (!positive || c < 0)) push(-c, op === '*' || op === ':' ? 'int-sign-mul' : 'sign')
  return out
}

/** Tallet uden komma og antal decimaler, fx 0,25 -> [25, 2]. */
function digitsOf(f: Frac): [number, number] {
  const k = decimals(f) ?? 0
  return [Math.round((f.n * 10 ** k) / f.d), k]
}

/** Typiske fejl med decimaltal i a ∘ b = c. */
export function decimalTrapCandidates(op: Op, a: Frac, b: Frac, c: Frac): TrapCandidate[] {
  const out: TrapCandidate[] = []
  const push = (f: Frac, kind: MisconceptionKind) => {
    const value = reduce(f)
    if (value.n <= 0 || equals(value, c) || decimals(value) === null) return
    if (out.some((o) => equals(frac(o.value.n, o.value.d), value))) return
    out.push({ value: token(value, 'dec'), kind })
  }
  const [A, ka] = digitsOf(a)
  const [B, kb] = digitsOf(b)
  switch (op) {
    case '+':
    case '-': {
      // 0,7 + 0,25 = 0,32: cifrene er stillet op fra højre i stedet for komma under komma.
      if (ka !== kb) {
        const k = Math.max(ka, kb)
        push(frac(op === '+' ? A + B : A - B, 10 ** k), 'dec-align')
      }
      push(op === '+' ? sub(a, b) : add(a, b), 'wrong-op')
      break
    }
    case '*':
    case ':':
      push(mul(c, frac(10)), 'dec-comma')
      push(div(c, frac(10)), 'dec-comma')
      break
  }
  return out
}

/**
 * Typiske fejl i "p % af det hele = delen".
 * `unknown` er det tal, eleven skal finde: 0 = procenten, 1 = det hele, 2 = delen.
 */
export function percentTrapCandidates(unknown: 0 | 1 | 2, p: Frac, whole: Frac, part: Frac): TrapCandidate[] {
  const out: TrapCandidate[] = []
  const correct = [p, whole, part][unknown]
  const push = (f: Frac, kind: MisconceptionKind, form: Form) => {
    const value = reduce(f)
    if (value.n <= 0 || equals(value, correct) || decimals(value) === null) return
    out.push({ value: token(value, form), kind })
  }
  const pctNumber = mul(p, frac(100)) // 25 % -> 25
  if (unknown === 2) {
    push(add(whole, pctNumber), 'pct-add', 'dec') // 80 + 25
    push(div(whole, pctNumber), 'pct-divide', 'dec') // 80 : 25
  } else if (unknown === 0) {
    push(div(div(part, whole), frac(100)), 'pct-no-100', 'pct') // 0,25 %
    push(div(whole, part), 'pct-flip', 'pct') // 400 %
  } else {
    push(mul(part, p), 'pct-mul-instead', 'dec') // 20 · 0,25
  }
  return out
}
