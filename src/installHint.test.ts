import { describe, expect, it } from 'vitest'
import { canSuggestInstall, dismissedRecently, type Device } from './installHint'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1'
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'

const device = (userAgent: string, extra: Partial<Device> = {}): Device => ({
  userAgent,
  platform: userAgent.includes('Macintosh') ? 'MacIntel' : 'iPhone',
  maxTouchPoints: 5,
  standalone: false,
  displayModeStandalone: false,
  ...extra,
})

describe('forslag om hjemmeskærmen', () => {
  it('vises i Safari og Chrome på iPhone og på iPad', () => {
    expect(canSuggestInstall(device(IPHONE_SAFARI))).toBe(true)
    expect(canSuggestInstall(device(IPHONE_CHROME))).toBe(true)
    expect(canSuggestInstall(device(IPAD_AS_MAC))).toBe(true)
  })

  it('vises ikke, når spillet allerede er åbnet fra hjemmeskærmen', () => {
    expect(canSuggestInstall(device(IPHONE_SAFARI, { standalone: true }))).toBe(false)
    expect(canSuggestInstall(device(IPHONE_SAFARI, { displayModeStandalone: true }))).toBe(false)
  })

  it('vises ikke på Mac, Android eller i apps som Instagram', () => {
    expect(canSuggestInstall(device(IPAD_AS_MAC, { maxTouchPoints: 0 }))).toBe(false)
    expect(canSuggestInstall(device(ANDROID, { platform: 'Linux armv8l' }))).toBe(false)
    expect(canSuggestInstall(device(INSTAGRAM))).toBe(false)
  })

  it('"Ikke nu" holder i 30 dage', () => {
    const day = 24 * 60 * 60 * 1000
    expect(dismissedRecently(null, 100 * day)).toBe(false)
    expect(dismissedRecently(80 * day, 100 * day)).toBe(true)
    expect(dismissedRecently(69 * day, 100 * day)).toBe(false)
  })
})
