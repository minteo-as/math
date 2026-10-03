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
.app.fill {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  padding-top: 12px;
  padding-bottom: 12px;
  overflow: hidden;
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
