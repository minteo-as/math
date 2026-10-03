<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Token } from '../engine/value'
import { moveFocus } from '../keyboardNav'
import FractionView from './FractionView.vue'

const props = defineProps<{
  tiles: Token[]
  bank: number[]
  selected: number | null
  dragging: number | null
  disabled: boolean
}>()

const emit = defineEmits<{
  /** `keyboard`: trykket kom fra tastaturet (Enter/mellemrum), ikke fra mus eller finger. */
  tapTile: [tile: number, keyboard: boolean]
  tapBank: []
  dragStart: [event: PointerEvent, tile: number]
}>()

// Bunken er ét stop med Tab; piletasterne flytter mellem brikkerne.
const bankEl = ref<HTMLElement | null>(null)
const active = ref<number | null>(null)
const tabTile = computed(() =>
  active.value !== null && props.bank.includes(active.value) ? active.value : props.bank[0],
)

function tileButtons(): HTMLElement[] {
  return [...(bankEl.value?.querySelectorAll<HTMLElement>('button.tile') ?? [])]
}

function onKeydown(event: KeyboardEvent) {
  moveFocus(event, tileButtons())
}

/** Flyt fokus til en brik i bunken – eller den første, hvis den ikke ligger der. */
function focusTile(tile?: number) {
  const buttons = tileButtons()
  const index = tile === undefined ? -1 : props.bank.indexOf(tile)
  buttons[index >= 0 ? index : 0]?.focus()
}

defineExpose({ focusTile })
</script>

<template>
  <div ref="bankEl" class="bank" data-bank @click.self="emit('tapBank')">
    <p v-if="bank.length === 0" class="empty" @click="emit('tapBank')">Alle brikker er lagt.</p>
    <button
      v-for="i in bank"
      :key="i"
      type="button"
      class="tile"
      :class="{ selected: selected === i, ghosted: dragging === i }"
      :disabled="disabled"
      :aria-pressed="selected === i"
      :tabindex="i === tabTile ? 0 : -1"
      @click="emit('tapTile', i, $event.detail === 0)"
      @focus="active = i"
      @keydown="onKeydown"
      @pointerdown="emit('dragStart', $event, i)"
    >
      <FractionView :value="tiles[i]" :fit="false" />
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
  min-width: var(--tile);
  padding: 0 6px;
  height: var(--tile);
  display: flex;
  align-items: center;
  justify-content: center;
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
