/**
 * Vite-plugin, der laver sw.js (service worker), så spillet virker uden net,
 * og så det kan installeres som app (Android/Chrome).
 *
 * Ved hver build får sw.js en liste over alle filer i dist/ og et versionsnummer ud fra
 * filernes indhold. Når et nyt build lægges op, ser browseren en ny sw.js, henter de nye
 * filer og sletter de gamle.
 *
 *  - Sider (index.html): hentes altid fra nettet, hvis der er net – ellers fra cachen.
 *  - Alt andet (JS, CSS, billeder): fra cachen, ellers fra nettet.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Plugin } from 'vite'

/** Filer i public/, der ikke skal med i cachen. */
const SKIP = new Set(['.htaccess'])

function publicFiles(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return publicFiles(path, root)
    const rel = relative(root, path).split('\\').join('/')
    return SKIP.has(rel) ? [] : [rel]
  })
}

const TEMPLATE = `// Lavet af scripts/service-worker.ts ved build – ret ikke i denne fil.
const CACHE = 'matkryds-__VERSION__'
const FILES = __FILES__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('matkryds-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    // Nyeste udgave, når der er net – ellers den gemte.
    event.respondWith(fetch(request).catch(() => caches.match('index.html')))
    return
  }
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)))
})
`

export function serviceWorker(publicDir = 'public'): Plugin {
  return {
    name: 'matkryds-service-worker',
    apply: 'build',
    // Efter Vite har lagt index.html i bundlen.
    enforce: 'post',
    generateBundle(_options, bundle) {
      const hash = createHash('sha256')
      const built = Object.values(bundle)
        .filter((file) => !file.fileName.endsWith('.map'))
        .map((file) => {
          hash.update(file.fileName)
          hash.update(file.type === 'chunk' ? file.code : file.source)
          return file.fileName
        })
      const fromPublic = publicFiles(publicDir).map((name) => {
        hash.update(name)
        hash.update(readFileSync(join(publicDir, name)))
        return name
      })
      const files = [...new Set([...built, ...fromPublic])].sort()
      const source = TEMPLATE.replace('__VERSION__', hash.digest('hex').slice(0, 12)).replace(
        '__FILES__',
        JSON.stringify(files, null, 2),
      )
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}
