import { describe, expect, it } from 'vitest'
import { algebraTrapCandidates, chooseX } from './algebra'
import type { Op } from './fraction'
import { exprText, intCoeffs, papply, pequals, pevalAt, poly } from './value'

function traps(op: Op, a: number[], b: number[]) {
  const p = poly(a)
  const q = poly(b)
  const c = papply(op, p, q)!
  return Object.fromEntries(algebraTrapCandidates(op, p, q, c).map((t) => [t.kind, exprText(intCoeffs(t.value)!)]))
}

describe('typiske algebrafejl', () => {
  it('samle led', () => {
    expect(traps('+', [0, 2], [0, 3])['alg-add-exponents']).toBe('5x²')
    expect(traps('+', [0, 1], [3])['alg-unlike']).toBe('4x')
    expect(traps('-', [2, 5], [-3, 1])['alg-minus-paren']).toBe('4x − 1')
  })

  it('gange og dividere led', () => {
    const t = traps('*', [0, 2], [0, 3])
    expect(t['alg-mul-degree']).toBe('6x')
    expect(t['alg-mul-add-coef']).toBe('5x²')
    expect(traps('*', [3], [0, 2])['alg-mul-add-coef']).toBe('5x')
    expect(traps(':', [0, 0, 6], [0, 2])['alg-div-degree']).toBe('3x²')
  })

  it('parenteser og kvadratsætninger', () => {
    expect(traps('*', [3], [2, 1])['alg-distribute-first']).toBe('3x + 2')
    expect(traps(':', [9, 6], [3])['alg-divide-first']).toBe('2x + 9')
    expect(traps('*', [3, 1], [3, 1])['alg-foil-cross']).toBe('x² + 9')
    expect(traps('*', [2, 1], [-2, 1])['alg-conj-sign']).toBe('x² + 4')
  })
})

describe('"Indsæt et tal"', () => {
  it('vælger et x, hvor den rigtige brik giver et andet tal end de andre', () => {
    // x² og 2x giver begge 4, når x = 2 – det må ikke vælges.
    const x = chooseX(poly([0, 0, 1]), [poly([0, 2]), poly([0, 0, 1])])
    expect(pequals(poly([pevalAt(poly([0, 0, 1]), x).n]), poly([pevalAt(poly([0, 2]), x).n]))).toBe(false)
  })
})
