import { describe, expect, it } from 'vitest'
import { frac } from './fraction'
import { exprText, papply, pdiv, pequals, pevalAt, pmul, poly, psub, valueText } from './value'

describe('polynomier', () => {
  it('regner plus, minus og gange', () => {
    expect(pequals(pmul(poly([3, 1]), poly([3, 1])), poly([9, 6, 1]))).toBe(true)
    expect(pequals(psub(poly([2, 5]), poly([-3, 1])), poly([5, 4]))).toBe(true)
  })

  it('dividerer kun, når det går op', () => {
    expect(pequals(pdiv(poly([9, 6]), poly([3]))!, poly([3, 2]))).toBe(true)
    expect(pequals(pdiv(poly([0, 0, 6]), poly([0, 2]))!, poly([0, 3]))).toBe(true)
    expect(pequals(pdiv(poly([-4, 0, 1]), poly([2, 1]))!, poly([-2, 1]))).toBe(true)
    expect(pdiv(poly([1, 0, 1]), poly([1, 1]))).toBeNull()
    expect(papply(':', poly([4]), poly([]))).toBeNull()
  })

  it('sætter tal ind for x', () => {
    expect(pevalAt(poly([9, 6, 1]), 2)).toEqual(frac(25))
  })

  it('skriver udtryk som i matematikbogen', () => {
    expect(exprText([9, 6, 1])).toBe('x² + 6x + 9')
    expect(exprText([3, -1])).toBe('−x + 3')
    expect(exprText([-4, 0, 1], true)).toBe('x²−4')
    expect(exprText([0, 1])).toBe('x')
    expect(valueText({ form: 'expr', c: [0, -2] })).toBe('−2x')
    expect(valueText({ n: 3, d: 4, form: 'frac' })).toBe('3/4')
  })
})
