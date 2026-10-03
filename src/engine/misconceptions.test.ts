import { describe, expect, it } from 'vitest'
import { frac, apply, tokenText, type Frac, type Op } from './fraction'
import { percentTrapCandidates, trapCandidates, type TrapOptions } from './misconceptions'

const plain: TrapOptions = { form: 'frac', negatives: false, reductionTraps: false, improperTraps: false }

function traps(op: Op, a: Frac, b: Frac, opts: TrapOptions = plain) {
  return Object.fromEntries(trapCandidates(op, a, b, apply(op, a, b), opts).map((t) => [t.kind, tokenText(t.value)]))
}

describe('typiske fejl', () => {
  it('plus: tællere og nævnere hver for sig', () => {
    expect(traps('+', frac(1, 2), frac(1, 3))['add-across']).toBe('2/5')
    expect(traps('+', frac(1, 2), frac(1, 3))['numerator-not-expanded']).toBe('1/3')
    expect(traps('+', frac(2, 7), frac(3, 7))['same-den-add']).toBe('5/14')
  })

  it('gange med helt tal: ganger også nævneren', () => {
    expect(traps('*', frac(3), frac(2, 5))['mul-whole-both']).toBe('6/15')
  })

  it('division: vender ikke / vender den forkerte', () => {
    const t = traps(':', frac(2, 3), frac(4, 5))
    expect(t['div-no-flip']).toBe('8/15')
    expect(t['div-flip-first']).toBe('6/5')
  })

  it('blandede tal: bytter om på brøkdelene', () => {
    const t = traps('-', frac(13, 4), frac(7, 4), { ...plain, form: 'mixed' })
    expect(t['mixed-sub-parts']).toBe('2 1/2')
  })

  it('fortegn, forkortning og blandet tal', () => {
    const t = traps('-', frac(2, 3), frac(5, 6), { ...plain, negatives: true, reductionTraps: true })
    expect(t['sign']).toBe('1/6')
    expect(t['not-reduced']).toBe('−2/12')
    const m = traps('+', frac(3, 4), frac(1, 2), { ...plain, form: 'mixed', improperTraps: true })
    expect(m['improper']).toBe('5/4')
  })
})

describe('typiske fejl med decimaltal og procent', () => {
  const dec: TrapOptions = { ...plain, form: 'dec' }

  it('komma under komma', () => {
    expect(traps('+', frac(7, 10), frac(1, 4), dec)['dec-align']).toBe('0,32')
  })

  it('kommaet forkert ved gange', () => {
    const found = trapCandidates('*', frac(1, 2), frac(2, 5), frac(1, 5), dec).map((t) => tokenText(t.value))
    expect(found).toEqual(expect.arrayContaining(['2', '0,02']))
  })

  it('procent af', () => {
    const texts = (u: 0 | 1 | 2) =>
      Object.fromEntries(
        percentTrapCandidates(u, frac(1, 4), frac(80), frac(20)).map((t) => [t.kind, tokenText(t.value)]),
      )
    expect(texts(2)).toEqual({ 'pct-add': '105', 'pct-divide': '3,2' })
    expect(texts(0)).toEqual({ 'pct-no-100': '0,25\u202F%', 'pct-flip': '400\u202F%' })
    expect(texts(1)).toEqual({ 'pct-mul-instead': '5' })
  })
})

describe('typiske fejl med hele tal', () => {
  const pos: TrapOptions = { ...plain, integer: true }
  const neg: TrapOptions = { ...plain, integer: true, negatives: true }

  it('mente og lån', () => {
    expect(traps('+', frac(47), frac(38), pos)['int-carry']).toBe('75')
    expect(traps('-', frac(52), frac(27), pos)['int-borrow']).toBe('35')
  })

  it('gangetabel og division', () => {
    const found = traps('*', frac(7), frac(8), pos)
    expect(found['int-table']).toBeDefined()
    expect(traps(':', frac(56), frac(8), pos)['int-div-table']).toMatch(/^(6|8)$/)
  })

  it('fortegn', () => {
    expect(traps('-', frac(4), frac(-3), neg)['int-minus-neg']).toBe('1')
    expect(traps('-', frac(-3), frac(5), neg)['int-neg-sub']).toBe('2')
    expect(traps('+', frac(-3), frac(5), neg)['int-neg-add']).toBe('−8')
    expect(traps('*', frac(-4), frac(6), neg)['int-sign-mul']).toBe('24')
    expect(traps('-', frac(5), frac(8), neg)['sign']).toBe('3')
  })

  it('ingen negative fælder eller tal over 99 uden negative tal', () => {
    const all = trapCandidates('-', frac(60), frac(52), frac(8), pos).concat(
      trapCandidates('+', frac(60), frac(39), frac(99), pos),
    )
    for (const t of all) expect(t.value.n > 0 && t.value.n <= 99).toBe(true)
  })
})
