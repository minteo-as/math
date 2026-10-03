/**
 * Algebra: typiske fejl (fælde-brikker), mellemregninger og hintet "Indsæt et tal".
 * Alle udtryk er polynomier i x (se value.ts).
 */
import { equals, frac, fracText, mul, add, type Frac, type Op, OP_SYMBOL } from './fraction'
import type { MisconceptionKind } from './types'
import {
  degree,
  exprText,
  intCoeffs,
  monomial,
  padd,
  pdiv,
  pequals,
  pevalAt,
  pmul,
  pneg,
  psub,
  terms,
  type Poly,
} from './value'

export interface AlgebraTrap {
  value: Poly
  kind: MisconceptionKind
}

const isMono = (p: Poly) => terms(p).length === 1
const multi = (p: Poly) => terms(p).length > 1

/** Det første led (højeste potens) og resten. */
function firstAndRest(p: Poly): [Poly, Poly] {
  const [[k, d], ...rest] = terms(p)
  return [monomial(k, d), rest.reduce<Poly>((acc, [kk, dd]) => padd(acc, monomial(kk, dd)), [])]
}

/** Alle led samlet til ét led med den højeste potens, fx x + 3 -> 4x. */
function collapse(p: Poly): Poly {
  const t = terms(p)
  const sum = t.reduce((acc, [k]) => add(acc, k), frac(0))
  return monomial(sum, t[0][1])
}

/**
 * De "forkerte svar", en elev typisk får i p ∘ q, hvor det rigtige svar er c.
 * Returnerer kun kandidater, der adskiller sig fra det rigtige svar.
 */
export function algebraTrapCandidates(op: Op, p: Poly, q: Poly, c: Poly): AlgebraTrap[] {
  const out: AlgebraTrap[] = []
  const push = (v: Poly | null, kind: MisconceptionKind) => {
    if (!v || v.length === 0 || pequals(v, c)) return
    if (out.some((o) => pequals(o.value, v))) return
    out.push({ value: v, kind })
  }
  const [tp, tq] = [terms(p), terms(q)]

  switch (op) {
    case '+':
    case '-': {
      // 2x + 3x = 5x²: potensen lægges til, når ensartede led samles.
      if (isMono(p) && isMono(q) && tp[0][1] === tq[0][1] && tp[0][1] >= 1) {
        const k = op === '+' ? add(tp[0][0], tq[0][0]) : add(tp[0][0], frac(-tq[0][0].n, tq[0][0].d))
        if (k.n !== 0) push(monomial(k, tp[0][1] + 1), 'alg-add-exponents')
      }
      // (5x + 2) − (x − 3) = 4x − 1: kun det første led i parentesen skifter fortegn.
      if (op === '-' && multi(q)) {
        const [first, rest] = firstAndRest(q)
        push(padd(psub(p, first), rest), 'alg-minus-paren')
      }
      // x + 3 = 4x: uensartede led samles alligevel.
      if (multi(c)) push(collapse(c), 'alg-unlike')
      push(op === '+' ? psub(p, q) : padd(p, q), 'wrong-op')
      break
    }
    case '*': {
      if (isMono(p) && isMono(q)) {
        // 2x · 3x = 6x (glemmer x · x = x²) og 2x · 3x = 5x² / 3 · 2x = 5x (lægger tallene sammen).
        if (tp[0][1] >= 1 && tq[0][1] >= 1) {
          push(monomial(mul(tp[0][0], tq[0][0]), Math.max(tp[0][1], tq[0][1])), 'alg-mul-degree')
        }
        if (tp[0][1] + tq[0][1] >= 1) push(monomial(add(tp[0][0], tq[0][0]), tp[0][1] + tq[0][1]), 'alg-mul-add-coef')
      } else if (isMono(p) !== isMono(q)) {
        // 3 · (x + 2) = 3x + 2: ganger kun ind på det første led.
        const [m, r] = isMono(p) ? [p, q] : [q, p]
        const [first, rest] = firstAndRest(r)
        push(padd(pmul(m, first), rest), 'alg-distribute-first')
      } else if (multi(p) && multi(q)) {
        // (x + 3)(x + 3) = x² + 9: kun første·første og sidste·sidste.
        const [fp, rp] = firstAndRest(p)
        const [fq, rq] = firstAndRest(q)
        push(padd(pmul(fp, fq), pmul(rp, rq)), 'alg-foil-cross')
        // (x + 2)(x − 2) = x² + 4: forkert fortegn på det sidste led.
        if (pequals(fp, fq) && pequals(rp, pneg(rq))) push(padd(pmul(fp, fq), pmul(rp, rp)), 'alg-conj-sign')
      }
      break
    }
    case ':': {
      if (isMono(p) && isMono(q) && tq[0][1] >= 1) {
        // 6x² : 2x = 3x²: dividerer kun tallene.
        const k = frac(tp[0][0].n * tq[0][0].d, tp[0][0].d * tq[0][0].n)
        push(monomial(k, tp[0][1]), 'alg-div-degree')
      } else if (multi(p) && isMono(q)) {
        // (6x + 9) : 3 = 2x + 9: dividerer kun det første led.
        const [first, rest] = firstAndRest(p)
        const d = pdiv(first, q)
        if (d) push(padd(d, rest), 'alg-divide-first')
      }
      break
    }
  }
  return out
}

// ---------- Mellemregninger (hint 2) ----------

/** Udtryk med parentes, hvis det har flere led eller er negativt (fx "· (−1)"). */
function par(p: Poly): string {
  const c = intCoeffs(p) ?? []
  const t = exprText(c)
  return multi(p) || t.startsWith('−') ? `(${t})` : t
}

function txt(p: Poly): string {
  return exprText(intCoeffs(p) ?? [])
}

/** Højre led i et stykke med op: parentes, hvis det er nødvendigt for at læse det rigtigt. */
function operand(p: Poly, op: Op, side: 'left' | 'right'): string {
  if (op === '*' || op === ':') return par(p)
  if (side === 'right') return par(p)
  return txt(p)
}

export function algebraSteps(origOp: Op, op: Op, p: Poly, q: Poly, pos: 0 | 1 | 2): string[] {
  const lines: string[] = []
  if (pos !== 2) {
    lines.push(`Omskriv, så ? står alene:  ? = ${operand(p, op, 'left')} ${OP_SYMBOL[op]} ${operand(q, op, 'right')}`)
    if (origOp === '*' && op === ':' && isMono(q)) {
      lines.push(`Det er det samme som at sætte ${txt(q)} uden for parentes: ${txt(p)} = ${txt(q)} · (?)`)
    }
  }
  const [tp, tq] = [terms(p), terms(q)]
  switch (op) {
    case '+':
      lines.push('Saml ensartede led: x²-led for sig, x-led for sig og tal for sig.')
      if (isMono(p) && isMono(q) && tp[0][1] === tq[0][1] && tp[0][1] >= 1) {
        lines.push('Kun tallene foran lægges sammen – potensen af x er den samme.')
      }
      break
    case '-':
      if (multi(q)) lines.push(`Minusparentes – skift fortegn på hvert led:  −${par(q)} = ${txt(pneg(q))}`)
      lines.push('Saml ensartede led: x²-led for sig, x-led for sig og tal for sig.')
      break
    case '*':
      if (isMono(p) && isMono(q)) {
        if (tp[0][1] === 0 || tq[0][1] === 0) {
          lines.push(`Gang tallene:  ${fracText(tp[0][0])} · ${fracText(tq[0][0])}. x-delen er den samme.`)
        } else {
          lines.push(
            `Gang tallene for sig og x’erne for sig:  ${fracText(tp[0][0])} · ${fracText(tq[0][0])}  og  ${powText(tp[0][1])} · ${powText(tq[0][1])}`,
          )
        }
      } else if (isMono(p) !== isMono(q)) {
        const [m, r] = isMono(p) ? [p, q] : [q, p]
        lines.push(
          `Gang ${txt(m)} ind på hvert led i parentesen:  ` +
            terms(r)
              .map(([k, d]) => `${txt(m)} · ${par(monomial(k, d))}`)
              .join('  og  '),
        )
      } else if (pequals(p, q)) {
        lines.push('Det er en kvadratsætning:  (a + b)² = a² + 2ab + b²')
      } else {
        const [fp, rp] = firstAndRest(p)
        const [fq, rq] = firstAndRest(q)
        if (pequals(fp, fq) && pequals(rp, pneg(rq))) lines.push('Det er en kvadratsætning:  (a + b)(a − b) = a² − b²')
        else lines.push('Gang hvert led i den første parentes med hvert led i den anden – det giver 4 gangestykker.')
      }
      break
    case ':':
      if (isMono(p) && isMono(q) && tq[0][1] === 0) {
        lines.push(`Divider tallene:  ${fracText(tp[0][0])} : ${fracText(tq[0][0])}. x-delen er den samme.`)
      } else if (isMono(p) && isMono(q)) {
        lines.push(
          `Divider tallene for sig og x’erne for sig:  ${fracText(tp[0][0])} : ${fracText(tq[0][0])}  og  ${powText(tp[0][1])} : ${powText(tq[0][1])}`,
        )
      } else if (isMono(q)) {
        lines.push(`Divider hvert led med ${txt(q)}.`)
      } else {
        const [fp] = firstAndRest(p)
        const [fq] = firstAndRest(q)
        lines.push(`Hvad skal ${par(q)} ganges med for at give ${txt(p)}?`)
        lines.push(`Start med de første led:  ${txt(fp)} : ${txt(fq)}`)
      }
      break
  }
  lines.push('Tjek dit svar ved at sætte et tal ind for x.')
  return lines
}

function powText(d: number): string {
  return d === 0 ? '1' : d === 1 ? 'x' : `x${d === 2 ? '²' : d === 3 ? '³' : `^${d}`}`
}

// ---------- "Indsæt et tal" (hint 4) ----------

/**
 * Vælger en x-værdi, hvor det rigtige svar giver et andet tal end alle andre brikker,
 * så eleven faktisk kan bruge tallet til at finde den rigtige brik.
 */
export function chooseX(correct: Poly, others: Poly[]): number {
  for (const x of [3, 4, 5, 2, 6, 7]) {
    const v = pevalAt(correct, x)
    if (others.every((o) => pequals(o, correct) || !equals(pevalAt(o, x), v))) return x
  }
  return 3
}

/** Linjerne i hintet: værdierne af de kendte udtryk og hvad ? skal give. */
export function substitutionLines(op: Op, vals: [Poly, Poly, Poly], pos: 0 | 1 | 2, x: number): string[] {
  const lines = [`Sæt x = ${x} ind i de kendte udtryk:`]
  vals.forEach((v, i) => {
    if (i === pos) return
    const value = fracText(pevalAt(v, x))
    lines.push(degree(v) >= 1 ? `${txt(v)}  giver  ${value}` : `${txt(v)} er bare ${value}`)
  })
  const n = vals.map((v) => pevalAt(v, x))
  const shown = n.map((f, i) => (i === pos ? '?' : fracText(f)))
  lines.push(`Stykket bliver:  ${shown[0]} ${OP_SYMBOL[op]} ${shown[1]} = ${shown[2]}`)
  lines.push(`Så skal ? give ${fracText(n[pos])}, når x = ${x}. Hvilken brik gør det?`)
  return lines
}

export type { Frac }
