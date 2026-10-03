/**
 * Ligninger som en trappe: hver række er den samme ligning, bare enklere, og mellem
 * rækkerne står den operation, der gøres på begge sider (fx −5 eller : 3).
 *
 *   3x + 5 = 20
 *      ↓ −5
 *       3x = 15
 *      ↓ : 3
 *        x = 5
 *
 * Et trin er rigtigt, når operationen brugt på begge sider af rækken over giver præcis
 * rækken under (som udtryk – så 2x + 6 og 2(x + 3) er det samme).
 */
import { fracText, type Op } from './fraction'
import { tokenKey, type Board, type BoardResult, type EquationResult } from './evaluate'
import type { HintTarget } from './hints'
import type { CellKey, LadderPuzzle, LadderSlot } from './types'
import {
  exprText,
  exprTokenText,
  isExpr,
  isStep,
  papply,
  pequals,
  pevalAt,
  poly,
  terms,
  termCount,
  tokenPoly,
  type ExprToken,
  type Poly,
  type StepToken,
  type Tile,
} from './value'

export const leftKey = (row: number): CellKey => `L${row}`
export const rightKey = (row: number): CellKey => `R${row}`
export const stepKey = (step: number): CellKey => `S${step}`

const OPS: Record<StepToken['op'], Op> = { '+': '+', '-': '-', '*': '*', ':': ':' }

/** Operationen brugt på den ene side. Null, hvis det ikke kan lade sig gøre (fx division med rest). */
export function applyStep(step: StepToken, side: Poly): Poly | null {
  return papply(OPS[step.op], side, poly(step.c))
}

function slotOf(p: LadderPuzzle, key: CellKey): LadderSlot {
  const n = Number(key.slice(1))
  if (key[0] === 'S') return p.steps[n].slot
  return key[0] === 'L' ? p.rows[n].left : p.rows[n].right
}

/** De tomme felter i den rækkefølge, man løser dem: S0, L1, R1, S1, L2, R2 … */
export function ladderBlankKeys(p: LadderPuzzle): CellKey[] {
  const keys: CellKey[] = []
  p.rows.forEach((_, row) => {
    const here = row === 0 ? [leftKey(0), rightKey(0)] : [stepKey(row - 1), leftKey(row), rightKey(row)]
    for (const key of here) if (slotOf(p, key).kind === 'blank') keys.push(key)
  })
  return keys
}

/** Felterne, der hører til trin i: operationen og rækken under den. */
export function stepCells(step: number): CellKey[] {
  return [stepKey(step), leftKey(step + 1), rightKey(step + 1)]
}

function valueAt(p: LadderPuzzle, board: Board, key: CellKey): Tile | null {
  const slot = slotOf(p, key)
  if (slot.kind === 'given') return slot.value
  const tile = board[key]
  return tile === null || tile === undefined ? null : p.tiles[tile]
}

/** Den rigtige værdi i hvert felt (givet eller fra løsningen). */
export function ladderTruth(p: LadderPuzzle): Map<CellKey, Tile> {
  const truth = new Map<CellKey, Tile>()
  const all = [...p.rows.flatMap((_, i) => [leftKey(i), rightKey(i)]), ...p.steps.map((_, i) => stepKey(i))]
  for (const key of all) {
    const slot = slotOf(p, key)
    truth.set(key, slot.kind === 'given' ? slot.value : p.tiles[p.solution[key]])
  }
  return truth
}

/** Er to brikker det samme? Operationer skal være ens; udtryk skal have samme værdi. */
export function sameValue(a: Tile, b: Tile): boolean {
  if (isStep(a) || isStep(b)) return isStep(a) && isStep(b) && tokenKey(a) === tokenKey(b)
  return pequals(tokenPoly(a), tokenPoly(b))
}

function checkStep(p: LadderPuzzle, board: Board, i: number): EquationResult['status'] {
  const s = valueAt(p, board, stepKey(i))
  const sides = [leftKey(i), rightKey(i), leftKey(i + 1), rightKey(i + 1)].map((k) => valueAt(p, board, k))
  if (s === null || sides.some((v) => v === null)) return 'incomplete'
  if (!isStep(s) || !sides.every((v) => v !== null && isExpr(v))) return 'wrong'
  const [l0, r0, l1, r1] = sides as ExprToken[]
  const left = applyStep(s, tokenPoly(l0))
  const right = applyStep(s, tokenPoly(r0))
  return left && right && pequals(left, tokenPoly(l1)) && pequals(right, tokenPoly(r1)) ? 'ok' : 'wrong'
}

/** Tjek hele trappen. "Ligningerne" i resultatet er trinnene. */
export function evaluateLadder(p: LadderPuzzle, board: Board): BoardResult {
  const equations = p.steps.map((_, i): EquationResult => {
    const status = checkStep(p, board, i)
    const trapHits =
      status === 'wrong'
        ? p.traps
            .filter((t) => {
              const tile = board[t.cell]
              return t.step === i && tile !== null && tile !== undefined && tokenKey(p.tiles[tile]) === tokenKey(p.tiles[t.tile])
            })
            .map((t) => ({ cell: t.cell, kind: t.kind }))
        : []
    return { status, formIssues: [], trapHits }
  })
  const complete = ladderBlankKeys(p).every((k) => board[k] !== null && board[k] !== undefined)
  return {
    equations,
    complete,
    solved: complete && equations.every((e) => e.status === 'ok'),
    wrongCount: equations.filter((e) => e.status === 'wrong').length,
  }
}

/** Antal måder at lægge brikkerne på, så hele trappen går op (stopper ved `limit`). */
export function countLadderSolutions(p: LadderPuzzle, limit = 2): number {
  const used = new Set<number>()
  let count = 0
  /** Ubrugte brikker, der passer – én af hver slags (ens brikker kan bytte plads). */
  const candidates = (fits: (t: Tile) => boolean): number[] => {
    const seen = new Set<string>()
    return p.tiles.flatMap((t, i) => {
      if (used.has(i) || !fits(t) || seen.has(tokenKey(t))) return []
      seen.add(tokenKey(t))
      return [i]
    })
  }
  const options = (slot: LadderSlot, want: Poly): (number | null)[] => {
    if (slot.kind === 'given') return pequals(tokenPoly(slot.value as ExprToken), want) ? [null] : []
    return candidates((t) => isExpr(t) && pequals(tokenPoly(t), want))
  }
  const take = (i: number | null, then: () => void) => {
    if (i !== null) used.add(i)
    then()
    if (i !== null) used.delete(i)
  }
  const rec = (step: number, left: Poly, right: Poly) => {
    if (count >= limit) return
    if (step === p.steps.length) {
      count++
      return
    }
    const slot = p.steps[step].slot
    const steps: [StepToken, number | null][] =
      slot.kind === 'given' ? [[slot.value, null]] : candidates(isStep).map((i) => [p.tiles[i] as StepToken, i])
    for (const [s, si] of steps) {
      const l = applyStep(s, left)
      const r = applyStep(s, right)
      if (!l || !r) continue
      take(si, () => {
        for (const li of options(p.rows[step + 1].left, l)) {
          take(li, () => {
            for (const ri of options(p.rows[step + 1].right, r)) take(ri, () => rec(step + 1, l, r))
          })
        }
      })
    }
  }
  const [l0, r0] = [p.rows[0].left, p.rows[0].right]
  if (l0.kind === 'given' && r0.kind === 'given') rec(0, tokenPoly(l0.value), tokenPoly(r0.value))
  return count
}

// ---------- Hints ----------

/** Første trin, hvor et felt mangler eller er forkert. */
export function ladderHintTarget(p: LadderPuzzle, board: Board): HintTarget | null {
  const truth = ladderTruth(p)
  for (let i = 0; i < p.steps.length; i++) {
    for (const key of stepCells(i)) {
      if (slotOf(p, key).kind === 'given') continue
      const tile = board[key]
      if (tile === null || tile === undefined || !sameValue(p.tiles[tile], truth.get(key)!)) {
        return { equation: i, cell: key, single: true }
      }
    }
  }
  return null
}

const SPACED: Record<StepToken['op'], string> = { '+': '+', '-': '−', '*': '·', ':': ':' }

/** Operationen med mellemrum, til mellemregninger: "− 5", ": 3". */
function spaced(s: StepToken): string {
  return `${SPACED[s.op]} ${exprText(s.c)}`
}

/** Udtrykket i parentes, hvis det har flere led (eller selv er en parentes/brøk). */
function wrapped(t: ExprToken): string {
  const text = exprTokenText(t)
  return termCount(t.c) > 1 || t.k !== undefined || t.d !== undefined ? `(${text})` : text
}

/** Hint 2: hvad gør man i det markerede trin – uden at give svaret. */
export function ladderExplain(p: LadderPuzzle, target: HintTarget): string[] {
  const i = target.equation
  const truth = ladderTruth(p)
  const step = truth.get(stepKey(i)) as StepToken
  const n = exprText(step.c)
  if (target.cell === stepKey(i)) {
    const lines: string[] = []
    switch (p.steps[i].why) {
      case 'konstant':
        lines.push(`Der står ${step.op === '-' ? '+' : '−'}${n} sammen med x. Gør det modsatte, så tallet forsvinder.`)
        break
      case 'koefficient':
        lines.push(`x er ganget med ${n}. Gør det modsatte, så der kun står x.`)
        break
      case 'naevner':
        lines.push(`x er divideret med ${n}. Gør det modsatte, så der kun står x.`)
        break
      case 'xled':
        lines.push(`Der er x’er på begge sider. Fjern ${n} fra højre side ved at gøre det modsatte.`)
        break
      case 'parentes':
        lines.push(`Hele parentesen er ganget med ${n}. Gør det modsatte, så parentesen står alene.`)
        break
    }
    lines.push('Det, du gør, skal gøres på begge sider af lighedstegnet.')
    return lines
  }
  const left = target.cell[0] === 'L'
  const before = truth.get(left ? leftKey(i) : rightKey(i)) as ExprToken
  const lines = [`Regn ${left ? 'venstre' : 'højre'} side ud:  ${wrapped(before)} ${spaced(step)}`]
  if (before.k !== undefined && step.op === ':') lines.push(`Parentesen er ganget med ${before.k}, så : ${before.k} fjerner tallet foran.`)
  else if (before.d !== undefined && step.op === '*') lines.push(`Udtrykket er divideret med ${before.d}, så · ${before.d} fjerner brøkstregen.`)
  else if (termCount(before.c) > 1 && (step.op === '+' || step.op === '-')) {
    lines.push('Saml ensartede led: x-led for sig og tal for sig.')
  }
  return lines
}

// ---------- Prøve ----------

/** Udtrykket med x erstattet af et tal, fx 3x + 5 med x = 4 → "3 · 4 + 5". */
function substituted(t: ExprToken, x: number): string {
  const xs = x < 0 ? `(−${-x})` : String(x)
  const parts = terms(poly(t.c)).map(([k, d], idx) => {
    const abs = Math.abs(k.n)
    const sign = k.n < 0 ? '−' : '+'
    // Et negativt x forrest står fint uden parentes: −21 − 5, men 3 · (−21) og 5 − (−21).
    const lone = idx === 0 && k.n > 0 && abs === 1
    const body = d === 0 ? String(abs) : lone ? (x < 0 ? `−${-x}` : String(x)) : abs === 1 ? xs : `${abs} · ${xs}`
    return idx === 0 ? (k.n < 0 ? `−${body}` : body) : ` ${sign} ${body}`
  })
  const inner = parts.join('') || '0'
  if (t.k !== undefined) return `${t.k} · (${inner})`
  if (t.d !== undefined) return termCount(t.c) > 1 ? `(${inner}) : ${t.d}` : `${inner} : ${t.d}`
  return inner
}

/** Prøven, der vises, når ligningen er løst: x sat ind i den første række. */
export function ladderProof(p: LadderPuzzle): string {
  const [l, r] = [p.rows[0].left, p.rows[0].right]
  if (l.kind !== 'given' || r.kind !== 'given') return ''
  const value = fracText(pevalAt(tokenPoly(l.value), p.x))
  const rightIsNumber = r.value.c.length <= 1 && r.value.k === undefined && r.value.d === undefined
  if (rightIsNumber) return `Prøve: ${substituted(l.value, p.x)} = ${value} ✓`
  return `Prøve: ${substituted(l.value, p.x)} = ${value}  og  ${substituted(r.value, p.x)} = ${value} ✓`
}

/** Sværhedsgrad til sortering inden for et niveau: antal trin, talstørrelse og negativ løsning. */
export function ladderDifficulty(p: LadderPuzzle): number {
  const truth = [...ladderTruth(p).values()].filter(isExpr)
  const digits = truth.reduce((s, t) => s + exprTokenText(t).replace(/\D/g, '').length, 0) / truth.length
  return p.steps.length + digits + (p.x < 0 ? 1 : 0)
}
