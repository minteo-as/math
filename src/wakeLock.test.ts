import { describe, expect, it } from 'vitest'
import { createWakeKeeper, IDLE_MS, type WakeLockDeps } from './wakeLock'

/** Falsk ur, timere og wake lock, så forløbet kan styres trin for trin. */
function setup(opts: { supported?: boolean; fail?: boolean } = {}) {
  let time = 0
  let visible = true
  const timers = new Map<number, { at: number; fn: () => void }>()
  let nextId = 1
  const locks: { released: boolean; release(): Promise<void> }[] = []
  const deps: WakeLockDeps = {
    wakeLock:
      opts.supported === false
        ? undefined
        : {
            request: async () => {
              if (opts.fail) throw new Error('NotAllowedError')
              const lock = {
                released: false,
                release: async () => {
                  lock.released = true
                },
              }
              locks.push(lock)
              return lock
            },
          },
    isVisible: () => visible,
    now: () => time,
    setTimer: (fn, ms) => {
      timers.set(nextId, { at: time + ms, fn })
      return nextId++
    },
    clearTimer: (id) => timers.delete(id as number),
  }
  const flush = () => new Promise((r) => setTimeout(r, 0))
  async function advance(ms: number) {
    time += ms
    for (const [id, t] of [...timers]) {
      if (t.at <= time) {
        timers.delete(id)
        t.fn()
      }
    }
    await flush()
  }
  const held = () => locks.filter((l) => !l.released).length
  return {
    deps,
    advance,
    flush,
    held,
    locks,
    hide: () => {
      visible = false
      locks.forEach((l) => (l.released = true)) // browseren slipper låsen i baggrunden
    },
    show: () => (visible = true),
  }
}

describe('skærmen holdes tændt', () => {
  it('tager låsen med det samme og slipper den efter 5 minutter uden aktivitet', async () => {
    const t = setup()
    const keeper = createWakeKeeper(t.deps)
    await t.flush()
    expect(t.held()).toBe(1)
    await t.advance(IDLE_MS - 1000)
    expect(t.held()).toBe(1)
    await t.advance(1000)
    expect(t.held()).toBe(0)
    keeper.activity() // næste tryk tager den igen
    await t.flush()
    expect(t.held()).toBe(1)
  })

  it('aktivitet udskyder tidspunktet, hvor låsen slippes', async () => {
    const t = setup()
    const keeper = createWakeKeeper(t.deps)
    await t.flush()
    await t.advance(IDLE_MS - 1000)
    keeper.activity()
    await t.advance(IDLE_MS - 1000)
    expect(t.held()).toBe(1)
    expect(t.locks).toHaveLength(1) // ingen ekstra lås ved aktivitet, når den allerede holdes
    await t.advance(1000)
    expect(t.held()).toBe(0)
  })

  it('tager låsen igen, når appen kommer tilbage fra baggrunden', async () => {
    const t = setup()
    const keeper = createWakeKeeper(t.deps)
    await t.flush()
    t.hide()
    expect(t.held()).toBe(0)
    t.show()
    keeper.visible()
    await t.flush()
    expect(t.held()).toBe(1)
  })

  it('stop slipper låsen for godt', async () => {
    const t = setup()
    const keeper = createWakeKeeper(t.deps)
    await t.flush()
    keeper.stop()
    keeper.activity()
    keeper.visible()
    await t.flush()
    expect(t.held()).toBe(0)
  })

  it('gør ingenting uden understøttelse eller ved afslag', async () => {
    for (const opts of [{ supported: false }, { fail: true }]) {
      const t = setup(opts)
      const keeper = createWakeKeeper(t.deps)
      keeper.activity()
      await t.advance(IDLE_MS)
      expect(t.held()).toBe(0)
      keeper.stop()
    }
  })
})
