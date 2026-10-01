<script setup lang="ts">
const version = __APP_VERSION__
</script>

<template>
  <main class="app">
    <RouterView :key="$route.fullPath" />
  </main>
  <footer class="version">Version {{ version }}</footer>
</template>

<style scoped>
.version {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 0 16px 24px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}
</style>
