/**
 * Forslag om at lægge spillet på hjemmeskærmen på iPhone og iPad.
 *
 * iOS har ingen funktion, som et script kan bruge til at installere en web-app (Chromes
 * "beforeinstallprompt" findes ikke på iOS). Derfor viser forsiden en vejledning i stedet.
 * Den vises kun i browseren på iOS – ikke når spillet allerede er åbnet fra hjemmeskærmen,
 * og ikke i apps som Instagram og Facebook, der ikke kan føje sider til hjemmeskærmen.
 */

export interface Device {
  userAgent: string
  platform: string
  maxTouchPoints: number
  /** Safaris egen markering af, at siden er åbnet fra hjemmeskærmen. */
  standalone: boolean
  /** (display-mode: standalone) – det samme for andre browsere. */
  displayModeStandalone: boolean
}

/** iPhone, iPod og iPad – også iPad, der udgiver sig for at være en Mac. */
export function isIos(d: Device): boolean {
  return /iPhone|iPad|iPod/.test(d.userAgent) || (d.platform === 'MacIntel' && d.maxTouchPoints > 1)
}

/** Apps med deres egen indbyggede browser, hvor "Føj til hjemmeskærm" ikke findes. */
const IN_APP = /FBAN|FBAV|Instagram|Snapchat|musical_ly|TikTok|LinkedInApp|Line\//

export function canSuggestInstall(d: Device): boolean {
  return isIos(d) && !d.standalone && !d.displayModeStandalone && !IN_APP.test(d.userAgent)
}

// ---------- "Ikke nu" huskes i 30 dage ----------

const KEY = 'matkryds.installHint.dismissed'
const QUIET_DAYS = 30

export function dismissedRecently(dismissedAt: number | null, now: number): boolean {
  return dismissedAt !== null && now - dismissedAt < QUIET_DAYS * 24 * 60 * 60 * 1000
}

function readDismissed(): number | null {
  try {
    const raw = localStorage.getItem(KEY)
    const value = raw === null ? NaN : Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function dismissInstallHint(now = Date.now()) {
  try {
    localStorage.setItem(KEY, String(now))
  } catch {
    // Privat vindue eller blokeret lager: forslaget kommer bare igen næste gang.
  }
}

function currentDevice(): Device {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
    displayModeStandalone: matchMedia('(display-mode: standalone)').matches,
  }
}

/** Skal forsiden vise forslaget lige nu? */
export function shouldShowInstallHint(now = Date.now()): boolean {
  return canSuggestInstall(currentDevice()) && !dismissedRecently(readDismissed(), now)
}
