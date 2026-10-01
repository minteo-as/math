/**
 * Laver PNG-ikonerne ud fra design/ikon.svg og public/favicon.svg.
 * Køres i hånden, når ikonet ændres (Playwright/Chromium skal være installeret):
 *   node design/render-icons.mjs
 * Tallene i ikon.svg er tekst i skriften DejaVu Sans Bold – derfor bruges PNG'erne på siden,
 * så ikonet ser ens ud uanset hvilke skrifter brugerens enhed har.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright')
const root = fileURLToPath(new URL('..', import.meta.url))
const icon = readFileSync(`${root}design/ikon.svg`, 'utf8')
const favicon = readFileSync(`${root}public/favicon.svg`, 'utf8')

const targets = [
  // Hjemmeskærm på iPhone (iOS runder selv hjørnerne – billedet skal være helt firkantet).
  { svg: icon, size: 180, out: 'public/apple-touch-icon.png' },
  // Ikonet på forsiden (vises i 76 px, her i 3x til skarpe skærme).
  { svg: icon, size: 228, out: 'src/assets/logo.png' },
  // Browserfanen i browsere, der ikke kan vise SVG-ikoner.
  { svg: favicon, size: 32, out: 'public/favicon-32.png', transparent: true },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 512, height: 512 } })
for (const t of targets) {
  const svg = t.svg.replace(/width="512" height="512"/, `width="${t.size}" height="${t.size}"`)
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
  await page.screenshot({ path: `${root}${t.out}`, clip: { x: 0, y: 0, width: t.size, height: t.size }, omitBackground: t.transparent ?? false })
  console.log(t.out)
}
await browser.close()
