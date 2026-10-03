import type { RouteLocationNormalized } from 'vue-router'

/**
 * Husk, hvor langt man har scrollet på forsiden og niveausiderne, så man kommer tilbage til
 * samme sted efter en bane – også når man bruger spillets egen "←" (et almindeligt link, så
 * browseren selv ikke husker positionen). Andre sider starter øverst.
 *
 * I browseren scroller selve siden. Fra hjemmeskærmen scroller .screen i stedet (se App.vue).
 * Positionerne huskes kun, mens spillet er åbent.
 */
const REMEMBER = new Set(['home', 'level'])
const positions = new Map<string, number>()

/** .screen, når det er den, der scroller (fra hjemmeskærmen) – ellers null. */
function screenScroller(): HTMLElement | null {
  const screen = document.querySelector<HTMLElement>('.screen')
  return screen && getComputedStyle(screen).overflowY === 'auto' ? screen : null
}

/** Gem positionen på den side, man forlader (kaldes fra router.beforeEach). */
export function rememberScroll(from: RouteLocationNormalized) {
  if (!from.name || !REMEMBER.has(String(from.name))) return
  positions.set(from.fullPath, screenScroller()?.scrollTop ?? window.scrollY)
}

/** Routerens scrollBehavior: tilbage til den gemte position eller øverst. */
export function restoreScroll(to: RouteLocationNormalized): { top: number } | false {
  const top = REMEMBER.has(String(to.name)) ? (positions.get(to.fullPath) ?? 0) : 0
  const screen = screenScroller()
  if (!screen) return { top }
  screen.scrollTo({ top })
  return false
}
