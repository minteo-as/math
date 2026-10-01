import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/** Kort commit-id: fra GitHub Actions, ellers fra git, ellers tomt. */
function commitId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

// Release-workflowen sætter RELEASE=1. Andre builds viser også commit-id'et,
// så man kan se forskel på en udgivet version og en test-build.
const isRelease = process.env.RELEASE === '1'
const commit = commitId()
const appVersion = isRelease || !commit ? pkg.version : `${pkg.version}+${commit}`

// base: './' gør, at det byggede spil kan ligge i en vilkårlig mappe
// på en statisk webserver (fx GitHub Pages eller skolens intranet).
export default defineConfig({
  base: './',
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
