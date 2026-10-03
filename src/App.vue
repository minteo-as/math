<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const version = __APP_VERSION__
const route = useRoute()
// Spillesiden fylder præcis skærmen: brættet scroller, resten står fast.
const fill = computed(() => route.name === 'game')

// Fra hjemmeskærmen scroller .screen i stedet for selve siden (se CSS nedenfor),
// så routerens "start øverst" skal også gælde den.
const screen = ref<HTMLElement | null>(null)
watch(
  () => route.fullPath,
  () => screen.value?.scrollTo({ top: 0 }),
  { flush: 'post' },
)
</script>

<template>
  <div ref="screen" class="screen" :class="{ fill }">
    <main class="app" :class="{ fill }">
      <RouterView :key="$route.fullPath" />
    </main>
    <footer v-if="!fill" class="version">Version {{ version }}</footer>
  </div>
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
  /* padding-top kommer fra .app, så topbjælken står samme sted som på de andre sider. */
  padding-bottom: 12px;
  background: var(--page-bg);
  overflow: hidden;
}
/* Fra hjemmeskærmen på iPhone slører Safari toppen af siden under statuslinjen – medmindre
   et fast element ligger ved kanten. Så her er hele skærmen et fast element, der selv
   scroller. Den klæbende stribe øverst holder farven ved kanten ens, mens man scroller.
   I browseren scroller siden som normalt. */
@media screen and (display-mode: standalone) {
  .screen {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    background: var(--page-bg);
  }
  .screen:not(.fill)::before {
    content: '';
    display: block;
    position: sticky;
    top: 0;
    z-index: 10;
    height: 12px;
    margin-bottom: -12px;
    background: var(--page-bg);
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
