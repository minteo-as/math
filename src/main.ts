import { createApp } from 'vue'
import App from './App.vue'
import { listenForInstallPrompt } from './installHint'
import { router } from './router'
import './style.css'

listenForInstallPrompt()
createApp(App).use(router).mount('#app')

// Service worker (laves ved build, se scripts/service-worker.ts): spillet virker uden net.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Uden service worker virker spillet stadig – bare ikke offline.
    })
  })
}
