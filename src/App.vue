<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const version = __APP_VERSION__
const route = useRoute()
// Spillesiden fylder præcis skærmen: brættet scroller, resten står fast.
const fill = computed(() => route.name === 'game')
</script>

<template>
  <main class="app" :class="{ fill }">
    <RouterView :key="$route.fullPath" />
  </main>
  <footer v-if="!fill" class="version">Version {{ version }}</footer>
</template>

<style scoped>
/* Spillesiden er et fast element, der dækker hele skærmen. Så farver Safari på iPhone
   statuslinjen med sidens baggrund i stedet for at sløre toppen af siden (det gør den,
   når indhold kan scrolle ind under statuslinjen). */
.app.fill {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  padding-bottom: 12px;
  background: var(--page-bg);
  overflow: hidden;
}
/* Fra hjemmeskærmen giver statuslinjen selv luft over knapperne. */
@media (display-mode: standalone) {
  .app.fill {
    padding-top: 0;
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
