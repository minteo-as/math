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

/**
 * Android beskærer "maskable" ikoner til en cirkel eller en anden form. Alt vigtigt skal
 * derfor ligge inden for den midterste cirkel (radius 40 %): baggrunden fylder det hele,
 * og resten skaleres ned omkring midten.
 */
function maskable(svg, scale = 0.72) {
  const [, open, background, rest] = /^(<svg[^>]*>)\s*(<rect[^>]*\/>)([\s\S]*)<\/svg>\s*$/.exec(svg)
  return `${open}${background}<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${rest}</g></svg>`
}

const targets = [
  // Hjemmeskærm på iPhone (iOS runder selv hjørnerne – billedet skal være helt firkantet).
  { svg: icon, size: 180, out: 'public/apple-touch-icon.png' },
  // Ikonet på forsiden (vises i 76 px, her i 3x til skarpe skærme).
  { svg: icon, size: 228, out: 'src/assets/logo.png' },
  // Installeret app på Android/Chrome (manifest.webmanifest).
  { svg: icon, size: 192, out: 'public/icon-192.png' },
  { svg: icon, size: 512, out: 'public/icon-512.png' },
  { svg: maskable(icon), size: 512, out: 'public/icon-maskable-512.png' },
  // Browserfanen i browsere, der ikke kan vise SVG-ikoner.
  { svg: favicon, size: 32, out: 'public/favicon-32.png', transparent: true },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 512, height: 512 } })
for (const t of targets) {
  const svg = t.svg.replace(/width="512" height="512"/, `width="${t.size}" height="${t.size}"`)
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
  await page.screenshot({
    path: `${root}${t.out}`,
    clip: { x: 0, y: 0, width: t.size, height: t.size },
    omitBackground: t.transparent ?? false,
  })
  console.log(t.out)
}
await browser.close()
