import { beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'broekkryds.progress.v1'

function mockStorage(value: string | null) {
  const store = new Map<string, string>()
  if (value !== null) store.set(KEY, value)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  })
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
    mockStorage('{"stars":{"1-01":3,"1-02":"2","1-03":7,"1-04":1.5,"1-05":1}}')
    expect((await loadProgress()).stars).toEqual({ '1-01': 3, '1-05': 1 })
  })
})
