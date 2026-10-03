import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import LevelView from './views/LevelView.vue'
import GameView from './views/GameView.vue'
import PrintView from './views/PrintView.vue'
import { rememberScroll, restoreScroll } from './scrollMemory'

// Hash-historik (#/bane/3-07), så spillet virker på enhver statisk webserver.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/niveau/:level', name: 'level', component: LevelView, props: (r) => ({ level: String(r.params.level) }) },
    { path: '/bane/:id', name: 'game', component: GameView, props: true },
    // Opgaveark til udskrift: en bane ("H3-05") eller et helt niveau ("H3").
    { path: '/udskriv/:target', name: 'print', component: PrintView, props: true },
  ],
  // Forsiden og niveausiderne husker, hvor langt man havde scrollet (se scrollMemory.ts).
  scrollBehavior: (to) => restoreScroll(to),
})

router.beforeEach((_to, from) => {
  rememberScroll(from)
})
