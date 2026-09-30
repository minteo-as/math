<script setup lang="ts">
withDefaults(defineProps<{ stars: number; max?: number; large?: boolean }>(), { max: 3, large: false })
</script>

<template>
  <span class="stars" :class="{ large }" :aria-label="`${stars} af ${max} stjerner`" role="img">
    <span v-for="i in max" :key="i" :class="i <= stars ? 'on' : 'off'">★</span>
  </span>
</template>

<style scoped>
.stars {
  display: inline-flex;
  gap: 1px;
  font-size: 20px;
  line-height: 1;
}
.large {
  font-size: 44px;
  gap: 6px;
}
.on {
  color: var(--star);
}
.off {
  color: var(--star-off);
}
</style>
