import { describe, expect, it } from 'vitest'
import { frac, apply, tokenText, type Frac, type Op } from './fraction'
import { trapCandidates, type TrapOptions } from './misconceptions'

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
