import { ref, shallowRef } from 'vue'

/**
 * Forslag om at lægge spillet på hjemmeskærmen (iPhone/iPad) eller startskærmen (Android).
 *
 * - iOS har ingen funktion, som et script kan bruge til at installere en web-app. Derfor
 *   viser forsiden en vejledning.
 * - På Android sender Chrome (og Samsung Internet) hændelsen "beforeinstallprompt", når
 *   spillet kan installeres. Så kan forsiden selv åbne browserens installationsdialog.
 *   Kommer hændelsen ikke (fx i Firefox), vises en vejledning i stedet.
 *
 * Forslaget vises kun i browseren – ikke når spillet allerede er åbnet fra hjemmeskærmen,
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

/**
 * Apps med deres egen indbyggede browser, hvor "Føj til hjemmeskærm" ikke findes.
 * "; wv)" er Androids indbyggede WebView, som apps bruger.
 */
const IN_APP = /FBAN|FBAV|Instagram|Snapchat|musical_ly|TikTok|LinkedInApp|Line\/|; wv\)/

export type InstallPlatform = 'ios' | 'android'

/** Hvilken vejledning passer til enheden – eller null, hvis der ikke skal foreslås noget. */
export function installPlatform(d: Device): InstallPlatform | null {
  if (d.standalone || d.displayModeStandalone || IN_APP.test(d.userAgent)) return null
  if (isIos(d)) return 'ios'
  if (/Android/.test(d.userAgent)) return 'android'
  return null
}

export function canSuggestInstall(d: Device): boolean {
  return installPlatform(d) !== null
}

// ---------- Installation med et tryk (Android) ----------

/** Chromes hændelse (findes ikke i TypeScripts standardtyper). */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Den gemte hændelse – sat, når browseren tilbyder installation. Kan kun bruges én gang. */
export const installPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
/** Sat, når spillet er blevet installeret. */
export const installed = ref(false)

/** Kaldes fra main.ts, før appen starter – hændelsen kan komme, før forsiden er vist. */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Browserens egen lille installationsbjælke vises ikke – forsiden har sit eget kort.
    event.preventDefault()
    installPrompt.value = event as BeforeInstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    installPrompt.value = null
  })
}

/** Åbn browserens installationsdialog. Giver true, hvis brugeren installerede. */
export async function promptInstall(): Promise<boolean> {
  const event = installPrompt.value
  if (!event) return false
  installPrompt.value = null
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
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

/** Skal forsiden vise forslaget lige nu – og i så fald for hvilken slags enhed? */
export function installHintPlatform(now = Date.now()): InstallPlatform | null {
  return dismissedRecently(readDismissed(), now) ? null : installPlatform(currentDevice())
}
