import { describe, expect, it } from 'vitest'
import { add, apply, decimals, div, frac, isReduced, mul, parts, reduce, sub, token, tokenText } from './fraction'

describe('brøkregning', () => {
  it('regner de fire regnearter og forkorter', () => {
    expect(add(frac(1, 2), frac(1, 3))).toEqual(frac(5, 6))
    expect(sub(frac(3, 4), frac(1, 4))).toEqual(frac(1, 2))
    expect(mul(frac(3), frac(2, 5))).toEqual(frac(6, 5))
    expect(div(frac(2, 3), frac(4, 5))).toEqual(frac(5, 6))
    expect(sub(frac(2, 3), frac(5, 6))).toEqual(frac(-1, 6))
  })

  it('holder nævneren positiv', () => {
    expect(frac(1, -2)).toEqual({ n: -1, d: 2 })
    expect(reduce(frac(-4, 8))).toEqual({ n: -1, d: 2 })
  })

  it('kender forskel på forkortet og uforkortet', () => {
    expect(isReduced(frac(2, 4))).toBe(false)
    expect(isReduced(frac(1, 2))).toBe(true)
  })

  it('viser blandede tal, hele tal og negative tal', () => {
    expect(tokenText(token(frac(7, 4), 'mixed'))).toBe('1 3/4')
    expect(tokenText(token(frac(7, 4)))).toBe('7/4')
    expect(tokenText(token(frac(-7, 4), 'mixed'))).toBe('−1 3/4')
    expect(tokenText(token(frac(3)))).toBe('3')
    expect(tokenText(token(frac(6, 8), 'mixed'))).toBe('6/8')
    expect(parts(token(frac(3, 4), 'mixed'))).toEqual({ negative: false, whole: null, num: 3, den: 4, text: null })
  })

  it('viser decimaltal med komma og procent med smalt mellemrum', () => {
    expect(tokenText(token(frac(1, 4), 'dec'))).toBe('0,25')
    expect(tokenText(token(frac(-7, 2), 'dec'))).toBe('−3,5')
    expect(tokenText(token(frac(12), 'dec'))).toBe('12')
    expect(tokenText(token(frac(1, 4), 'pct'))).toBe('25\u202F%')
    expect(tokenText(token(frac(1, 8), 'pct'))).toBe('12,5\u202F%')
    expect(decimals(frac(1, 3))).toBeNull()
    expect(() => tokenText(token(frac(1, 3), 'dec'))).toThrow()
  })

  it('"af" er gange', () => {
    expect(apply('af', frac(1, 4), frac(80))).toEqual(frac(20))
  })
})
