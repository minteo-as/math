<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const version = __APP_VERSION__
const route = useRoute()
// Spillesiden fylder præcis skærmen: brættet scroller, resten står fast.
const fill = computed(() => route.name === 'game')

// Fra hjemmeskærmen scroller .screen i stedet for selve siden (se CSS nedenfor). Routeren
// sætter scrollpositionen for begge (se scrollMemory.ts).
</script>

<template>
  <div class="screen" :class="{ fill }">
    <main class="app" :class="{ fill }">
      <RouterView :key="$route.fullPath" />
    </main>
    <footer v-if="!fill" class="version">Version {{ version }}</footer>
  </div>
</template>

<style scoped>
/* I browseren er spillesiden et fast element, der dækker hele skærmen. Så farver Safari på
   iPhone statuslinjen med sidens baggrund i stedet for at sløre toppen af siden (det gør den,
   når indhold kan scrolle ind under statuslinjen). Fra hjemmeskærmen: se nedenfor. */
.app.fill {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  /* padding-top kommer fra .app, så topbjælken står samme sted som på de andre sider. */
  padding-bottom: 12px;
  background: var(--page-bg);
  overflow: hidden;
}
/* Fra hjemmeskærmen på iPhone farver Safari statuslinjen ud fra toppen af siden:
   - Scroller selve siden, slører Safari toppen, når indhold scroller ind under statuslinjen.
   - Ligger der et fast element ved kanten, får statuslinjen dets farve, når siden indlæses,
     og følger ikke med bagefter (fx når hjælpemenuen tones ned, eller man skifter til mørk).
   Derfor scroller selve siden aldrig (se style.css), .screen scroller indeni, og der er intet
   fast element ved kanten. Så følger statuslinjen med siden. Statuslinjen giver selv luft
   over indholdet, så der er ingen padding øverst. I browseren er intet ændret. */
@media screen and (display-mode: standalone) {
  .screen {
    height: 100%;
    overflow-y: auto;
  }
  .app {
    padding-top: 0;
  }
  .app.fill {
    position: static;
    height: 100%;
  }
}
.version {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 0 16px 24px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}
@media print {
  .version {
    display: none;
  }
}
</style>
