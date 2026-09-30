<script setup lang="ts">
import { computed } from 'vue'
import { OP_SYMBOL } from '../engine/fraction'
import type { Board } from '../engine/evaluate'
import { cellKey, type CellKey, type Puzzle } from '../engine/types'
import FractionView from './FractionView.vue'

const props = defineProps<{
  puzzle: Puzzle
  board: Board
  locked: Set<CellKey>
  wrongEquations: number[]
  hintEquation: number | null
  hintCell: CellKey | null
  solved: boolean
  canDrop: boolean
}>()

const emit = defineEmits<{
  tapCell: [cell: CellKey]
  dragStart: [event: PointerEvent, tile: number]
}>()

const wrongCells = computed(() => new Set(props.wrongEquations.flatMap((i) => props.puzzle.equations[i].cells)))
const hintCells = computed(() => new Set(props.hintEquation === null ? [] : props.puzzle.equations[props.hintEquation].cells))

const cells = computed(() =>
  props.puzzle.cells.map((cell) => {
    const key = cellKey(cell.r, cell.c)
    const tile = cell.kind === 'blank' ? props.board[key] : null
    return {
      key,
      cell,
      tile: tile ?? null,
      style: { gridRow: cell.r + 1, gridColumn: cell.c + 1 },
      classes: {
        [`cell-${cell.kind}`]: true,
        filled: tile !== null && tile !== undefined,
        locked: props.locked.has(key),
        wrong: wrongCells.value.has(key),
        hint: hintCells.value.has(key),
        target: props.hintCell === key,
        solved: props.solved,
        droppable: props.canDrop && cell.kind === 'blank',
      },
    }
  }),
)
</script>

<template>
  <div class="grid" :style="{ '--cols': puzzle.cols, '--rows': puzzle.rows }">
    <template v-for="c in cells" :key="c.key">
      <button
        v-if="c.cell.kind === 'blank'"
        type="button"
        class="cell"
        :class="c.classes"
        :style="c.style"
        :data-cell="c.key"
        :aria-label="c.tile === null ? 'Tomt felt' : 'Felt med brik – tryk for at fjerne'"
        @click="emit('tapCell', c.key)"
        @pointerdown="c.tile !== null && !c.classes.locked && emit('dragStart', $event, c.tile)"
      >
        <FractionView v-if="c.tile !== null" :value="puzzle.tiles[c.tile]" />
      </button>
      <div v-else class="cell" :class="c.classes" :style="c.style">
        <FractionView v-if="c.cell.kind === 'given'" :value="c.cell.value" />
        <span v-else-if="c.cell.kind === 'op'" class="symbol">{{ OP_SYMBOL[c.cell.op] }}</span>
        <span v-else class="symbol">=</span>
        <span v-if="c.cell.kind === 'eq' && c.classes.wrong" class="badge badge-wrong" aria-label="Forkert">✗</span>
        <span v-else-if="c.cell.kind === 'eq' && solved" class="badge badge-ok" aria-label="Rigtigt">✓</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-template-rows: repeat(var(--rows), var(--cell));
  justify-content: center;
  font-size: calc(var(--cell) * 0.34);
}
.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font: inherit;
  color: var(--ink);
  background: var(--cell-bg);
  border: 1px solid var(--cell-border);
  margin: -0.5px;
  position: relative;
}
.symbol {
  font-size: 1.5em;
  font-weight: 700;
}
.cell-given {
  background: var(--given-bg);
}
.cell-blank {
  background: var(--blank-bg);
  cursor: pointer;
  touch-action: none;
}
.cell-blank.filled {
  background: var(--tile-bg);
  color: var(--tile-ink);
}
.cell-blank.locked {
  background: var(--locked-bg);
  color: var(--locked-ink);
  cursor: default;
}
.cell-blank:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: -3px;
  z-index: 2;
}
.droppable:not(.filled) {
  box-shadow: inset 0 0 0 2px var(--accent);
}
.hint {
  background-color: var(--hint-bg);
  box-shadow: inset 0 0 0 2px var(--hint-ring);
}
.target {
  box-shadow: inset 0 0 0 3px var(--hint-ring);
  animation: pulse 1.2s ease-in-out infinite;
  z-index: 1;
}
.wrong {
  background-color: var(--wrong-bg);
  border-color: var(--wrong);
}
.wrong.cell-blank.filled {
  color: var(--wrong);
}
.solved.cell-blank.filled,
.solved.cell-blank.locked {
  background: var(--ok-bg);
  color: var(--ok);
}
.badge {
  position: absolute;
  top: -0.55em;
  right: -0.55em;
  width: 1.3em;
  height: 1.3em;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.8em;
  font-weight: 700;
  color: #fff;
  z-index: 3;
}
.badge-wrong {
  background: var(--wrong);
}
.badge-ok {
  background: var(--ok);
}
@keyframes pulse {
  50% {
    box-shadow: inset 0 0 0 5px var(--hint-ring);
  }
}
@media (prefers-reduced-motion: reduce) {
  .target {
    animation: none;
  }
}
</style>
