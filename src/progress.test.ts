import { beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'broekkryds.progress.v1'

function mockStorage(value: string | null) {
  const store = new Map<string, string>()
  if (value !== null) store.set(KEY, value)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  })
  return store
}

async function loadProgress() {
  vi.resetModules()
  return (await import('./progress')).progress
}

describe('indlæsning af fremskridt', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it.each([['{"stars":null}'], ['{"stars":[1,2]}'], ['null'], ['ikke json'], ['{"stars":"x"}']])(
    'falder tilbage til tomt fremskridt ved %s',
    async (raw) => {
      mockStorage(raw)
      expect((await loadProgress()).stars).toEqual({})
    },
  )

  it('beholder kun gyldige stjerner', async () => {
    mockStorage('{"v":2,"stars":{"1-01":3,"1-02":"2","1-03":7,"1-04":1.5,"1-05":1}}')
    expect((await loadProgress()).stars).toEqual({ '1-01': 3, '1-05': 1 })
  })

  it('flytter stjerner fra før sorteringen over på samme bane', async () => {
    const { PUZZLES } = await import('./puzzles')
    const moved = PUZZLES.find((p) => p.formerId === '1-01')!
    const store = mockStorage('{"stars":{"1-01":3,"H4-07":2}}')
    const stars = (await loadProgress()).stars
    expect(stars[moved.id]).toBe(3)
    expect(stars[PUZZLES.find((p) => p.formerId === 'H4-07')!.id]).toBe(2)
    expect(Object.keys(stars)).toHaveLength(2)
    // Gemt igen som version 2, så det kun sker én gang.
    expect(JSON.parse(store.get(KEY)!).v).toBe(2)
  })

  it('dropper stjerner på de baner på brøk 5, der er skiftet ud', async () => {
    const { PUZZLES } = await import('./puzzles')
    mockStorage('{"stars":{"5-01":3,"5-02":2}}')
    const stars = (await loadProgress()).stars
    expect(stars).toEqual({ [PUZZLES.find((p) => p.formerId === '5-02')!.id]: 2 })
  })
})
