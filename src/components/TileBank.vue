<script setup lang="ts">
import type { NumToken } from '../engine/fraction'
import FractionView from './FractionView.vue'

defineProps<{
  tiles: NumToken[]
  bank: number[]
  selected: number | null
  dragging: number | null
  disabled: boolean
}>()

const emit = defineEmits<{
  tapTile: [tile: number]
  tapBank: []
  dragStart: [event: PointerEvent, tile: number]
}>()
</script>

<template>
  <div class="bank" data-bank @click.self="emit('tapBank')">
    <p v-if="bank.length === 0" class="empty" @click="emit('tapBank')">Alle brikker er lagt.</p>
    <button
      v-for="i in bank"
      :key="i"
      type="button"
      class="tile"
      :class="{ selected: selected === i, ghosted: dragging === i }"
      :disabled="disabled"
      :aria-pressed="selected === i"
      @click="emit('tapTile', i)"
      @pointerdown="emit('dragStart', $event, i)"
    >
      <FractionView :value="tiles[i]" />
    </button>
  </div>
</template>

<style scoped>
.bank {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  min-height: calc(var(--tile) + 24px);
  background: var(--surface);
  border-radius: 14px;
  font-size: calc(var(--tile) * 0.34);
}
.empty {
  margin: auto;
  color: var(--muted);
  font-size: 15px;
}
.tile {
  width: var(--tile);
  height: var(--tile);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font: inherit;
  color: var(--tile-ink);
  background: var(--tile-bg);
  border: 2px solid var(--tile-border);
  border-radius: 6px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: transform 0.1s;
}
.tile.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent);
  transform: translateY(-3px);
}
.tile.ghosted {
  opacity: 0.35;
}
.tile:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
.tile:disabled {
  cursor: default;
  opacity: 0.6;
}
</style>
