/**
 * Hold skærmen tændt, mens man spiller (Screen Wake Lock).
 *
 * Telefonen dæmper ellers lyset og slukker skærmen, mens eleven tænker. Låsen holdes kun på
 * spillesiden og kun, mens der bliver spillet: efter IDLE_MS uden tryk eller tast slippes den,
 * så telefonen kan slukke som normalt, hvis den bliver lagt fra sig. Næste tryk tager den igen.
 *
 * Browseren slipper selv låsen, når appen går i baggrunden – den tages igen, når man kommer
 * tilbage. Uden understøttelse (ældre browsere, eller siden er ikke https) sker der ingenting.
 */

export const IDLE_MS = 5 * 60 * 1000

interface Sentinel {
  released: boolean
  release(): Promise<void>
}

export interface WakeLockDeps {
  /** navigator.wakeLock – eller undefined, hvis browseren ikke kan. */
  wakeLock?: { request(type: 'screen'): Promise<Sentinel> }
  isVisible(): boolean
  now(): number
  setTimer(fn: () => void, ms: number): unknown
  clearTimer(id: unknown): void
}

export interface WakeKeeper {
  /** Kald ved tryk og tastetryk: tag låsen (igen) og start forfra på tiden. */
  activity(): void
  /** Kald, når appen bliver synlig igen. */
  visible(): void
  /** Slip låsen for godt (når man forlader spillesiden). */
  stop(): void
}

export function createWakeKeeper(deps: WakeLockDeps): WakeKeeper {
  let sentinel: Sentinel | null = null
  let pending = false
  let lastActivity = deps.now()
  let timer: unknown = null
  let stopped = false

  async function acquire() {
    if (stopped || pending || !deps.wakeLock || !deps.isVisible()) return
    if (sentinel && !sentinel.released) return
    pending = true
    try {
      const s = await deps.wakeLock.request('screen')
      // Nået at forlade siden eller gå i dvale, mens vi ventede?
      if (stopped || deps.now() - lastActivity >= IDLE_MS) void s.release()
      else sentinel = s
    } catch {
      // Fx lavt batteri eller strømsparetilstand – så slukker skærmen bare som normalt.
    } finally {
      pending = false
    }
  }

  function release() {
    if (sentinel && !sentinel.released) void sentinel.release()
    sentinel = null
  }

  function scheduleIdleCheck() {
    if (timer !== null) deps.clearTimer(timer)
    timer = deps.setTimer(
      () => {
        timer = null
        const idle = deps.now() - lastActivity
        if (idle >= IDLE_MS) release()
        else scheduleIdleCheck()
      },
      IDLE_MS - (deps.now() - lastActivity),
    )
  }

  function activity() {
    if (stopped) return
    lastActivity = deps.now()
    void acquire()
    scheduleIdleCheck()
  }

  activity()

  return {
    activity,
    visible() {
      if (deps.now() - lastActivity < IDLE_MS) void acquire()
    },
    stop() {
      stopped = true
      if (timer !== null) deps.clearTimer(timer)
      timer = null
      release()
    },
  }
}

/** Hold skærmen tændt på den side, der kalder (bruges i GameView). Giver en oprydningsfunktion. */
export function keepScreenAwake(): () => void {
  const keeper = createWakeKeeper({
    wakeLock: (navigator as Navigator & { wakeLock?: WakeLockDeps['wakeLock'] }).wakeLock,
    isVisible: () => document.visibilityState === 'visible',
    now: () => Date.now(),
    setTimer: (fn, ms) => window.setTimeout(fn, ms),
    clearTimer: (id) => window.clearTimeout(id as number),
  })
  const onActivity = () => keeper.activity()
  const onVisibility = () => {
    if (document.visibilityState === 'visible') keeper.visible()
  }
  window.addEventListener('pointerdown', onActivity, { passive: true })
  window.addEventListener('keydown', onActivity)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.removeEventListener('pointerdown', onActivity)
    window.removeEventListener('keydown', onActivity)
    document.removeEventListener('visibilitychange', onVisibility)
    keeper.stop()
  }
}
