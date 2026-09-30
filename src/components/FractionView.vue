<script setup lang="ts">
import { computed } from 'vue'
import { parts, tokenText, type NumToken } from '../engine/fraction'

const props = defineProps<{ value: NumToken }>()
const p = computed(() => parts(props.value))
const label = computed(() => tokenText(props.value))
</script>

<template>
  <span class="num" :aria-label="label" role="img">
    <span v-if="p.negative" class="sign">−</span>
    <span v-if="p.text !== null" class="text" :class="{ long: p.text.length >= 5 }">{{ p.text }}</span>
    <span v-if="p.whole !== null" class="whole">{{ p.whole }}</span>
    <span v-if="p.num !== null" class="frac">
      <span class="top">{{ p.num }}</span>
      <span class="bottom">{{ p.den }}</span>
    </span>
  </span>
</template>

<style scoped>
.num {
  display: inline-flex;
  align-items: center;
  gap: 0.08em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}
.sign,
.whole {
  font-size: var(--num-size, 1.4em);
  font-weight: 700;
}
.text {
  font-size: 1.1em;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.text.long {
  font-size: 0.85em;
}
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: var(--frac-size, 0.95em);
  font-weight: 700;
}
.top {
  padding: 0 0.12em 0.08em;
  border-bottom: 0.11em solid currentColor;
}
.bottom {
  padding: 0.08em 0.12em 0;
}
</style>
