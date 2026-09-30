import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// base: './' gør, at det byggede spil kan ligge i en vilkårlig mappe
// på en statisk webserver (fx GitHub Pages eller skolens intranet).
export default defineConfig({
  base: './',
  plugins: [vue()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
