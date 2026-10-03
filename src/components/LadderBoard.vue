<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Board } from '../engine/evaluate'
import { leftKey, rightKey, stepKey } from '../engine/ladder'
import type { CellKey, LadderPuzzle, LadderSlot } from '../engine/types'
import { moveFocus } from '../keyboardNav'
import FractionView from './FractionView.vue'

/**
 * Ligningstrappen. Samme props og events som PuzzleGrid, så spillesiden kan bruge begge:
 * "ligningerne" er her trinnene (operationen og rækken under den).
 */
const props = defineProps<{
  puzzle: LadderPuzzle
  board: Board
  locked: Set<CellKey>
  wrongEquations: number[]
  hintEquation: number | null
  hintCell: CellKey | null
  solved: boolean
  canDrop: boolean
  /** Bruges ikke – trappens papirstørrelse står i CSS (findes for at matche PuzzleGrid). */
  printUnit?: number
  printHeight?: number
}>()

const emit = defineEmits<{
  tapCell: [cell: CellKey, keyboard: boolean]
  dragStart: [event: PointerEvent, tile: number]
}>()

interface Cell {
  key: CellKey
  slot: LadderSlot
  /** Det trin, feltet hører til (rækken under en operation hører til operationen). */
  step: number | null
  isStep: boolean
}

function cell(key: CellKey, slot: LadderSlot, step: number | null, isStep = false): Cell {
  return { key, slot, step, isStep }
}

const rows = computed(() =>
  props.puzzle.rows.map((row, i) => ({
    left: cell(leftKey(i), row.left, i > 0 ? i - 1 : null),
    right: cell(rightKey(i), row.right, i > 0 ? i - 1 : null),
    step: i < props.puzzle.steps.length ? cell(stepKey(i), props.puzzle.steps[i].slot, i, true) : null,
  })),
)

function tileAt(c: Cell): number | null {
  if (c.slot.kind !== 'blank') return null
  return props.board[c.key] ?? null
}

function classes(c: Cell, row: number) {
  const tile = tileAt(c)
  const hintRow = props.hintEquation !== null && (row === props.hintEquation || row === props.hintEquation + 1)
  return {
    'cell-given': c.slot.kind === 'given',
    'cell-blank': c.slot.kind === 'blank',
    'step-cell': c.isStep,
    filled: tile !== null,
    locked: props.locked.has(c.key),
    wrong: c.step !== null && props.wrongEquations.includes(c.step),
    hint: c.isStep ? c.step === props.hintEquation : hintRow,
    target: props.hintCell === c.key,
    solved: props.solved,
    droppable: props.canDrop && c.slot.kind === 'blank',
  }
}

function label(c: Cell): string {
  const filled = tileAt(c) !== null
  if (c.isStep) return filled ? 'Operation – tryk for at fjerne' : 'Tomt felt til operationen'
  return filled ? 'Felt med brik – tryk for at fjerne' : 'Tomt felt'
}

// ---------- Tastatur (som i PuzzleGrid) ----------

const el = ref<HTMLElement | null>(null)
const active = ref<CellKey | null>(null)
const blankKeys = computed(() =>
  rows.value
    .flatMap((r) => [r.left, r.right, r.step])
    .filter((c): c is Cell => !!c && c.slot.kind === 'blank')
    .map((c) => c.key),
)
const tabCell = computed(() =>
  active.value && blankKeys.value.includes(active.value) ? active.value : blankKeys.value[0],
)

function cellButtons(): HTMLElement[] {
  return [...(el.value?.querySelectorAll<HTMLElement>('button[data-cell]') ?? [])]
}

function onKeydown(event: KeyboardEvent) {
  moveFocus(event, cellButtons())
}

function focusCell(key: CellKey) {
  cellButtons()
    .find((b) => b.dataset.cell === key)
    ?.focus()
}

defineExpose({ focusCell, activeCell: () => active.value })
</script>

<template>
  <div ref="el" class="ladder">
    <template v-for="(row, i) in rows" :key="i">
      <template v-for="c in [row.left, row.right]" :key="c.key">
        <button
          v-if="c.slot.kind === 'blank'"
          type="button"
          class="cell side"
          :class="[classes(c, i), c === row.left ? 'left' : 'right']"
          :data-cell="c.key"
          :tabindex="c.key === tabCell ? 0 : -1"
          :aria-label="label(c)"
          @click="emit('tapCell', c.key, $event.detail === 0)"
          @focus="active = c.key"
          @keydown="onKeydown"
          @pointerdown="tileAt(c) !== null && !locked.has(c.key) && emit('dragStart', $event, tileAt(c)!)"
        >
          <FractionView v-if="tileAt(c) !== null" :value="puzzle.tiles[tileAt(c)!]" plain />
        </button>
        <div v-else class="cell side" :class="[classes(c, i), c === row.left ? 'left' : 'right']">
          <FractionView :value="c.slot.value" plain />
        </div>
        <span v-if="c === row.left" class="cell eq" :class="{ hint: classes(c, i).hint }">=</span>
      </template>

      <div v-if="row.step" class="step-row">
        <span class="arrow" aria-hidden="true">↓</span>
        <button
          v-if="row.step.slot.kind === 'blank'"
          type="button"
          class="cell"
          :class="classes(row.step, i)"
          :data-cell="row.step.key"
          :tabindex="row.step.key === tabCell ? 0 : -1"
          :aria-label="label(row.step)"
          @click="emit('tapCell', row.step.key, $event.detail === 0)"
          @focus="active = row.step.key"
          @keydown="onKeydown"
          @pointerdown="
            tileAt(row.step) !== null && !locked.has(row.step.key) && emit('dragStart', $event, tileAt(row.step)!)
          "
        >
          <FractionView v-if="tileAt(row.step) !== null" :value="puzzle.tiles[tileAt(row.step)!]" plain />
          <span v-if="wrongEquations.includes(i)" class="badge badge-wrong" aria-label="Forkert">✗</span>
          <span v-else-if="solved" class="badge badge-ok" aria-label="Rigtigt">✓</span>
        </button>
        <div v-else class="cell" :class="classes(row.step, i)">
          <FractionView :value="row.step.slot.value" plain />
        </div>
        <span class="arrow" aria-hidden="true">↓</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ladder {
  display: grid;
  grid-template-columns: 1fr 40px 1fr;
  max-width: 420px;
  margin: 0 auto;
  font-size: 22px;
}
.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  font: inherit;
  font-weight: 700;
  color: var(--ink);
  background: var(--cell-bg);
  border: 1px solid var(--cell-border);
  margin: -0.5px;
  position: relative;
}
.side {
  height: 60px;
  min-width: 0;
}
.eq {
  height: 60px;
  font-size: 1.3em;
}
.step-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 8px 0;
}
.arrow {
  text-align: center;
  color: var(--muted);
  font-size: 0.9em;
}
.step-row .cell {
  min-width: 96px;
  height: 46px;
  border-radius: 10px;
  border-style: dashed;
}
.cell-given {
  background: var(--given-bg);
}
.step-row .cell-given {
  border-style: solid;
}
.cell-blank {
  background: var(--blank-bg);
  border-radius: 12px;
  cursor: pointer;
  touch-action: manipulation;
}
.cell-blank.filled:not(.locked) {
  touch-action: none;
}
.cell-blank.filled {
  background: var(--tile-bg);
  color: var(--tile-ink);
  border-style: solid;
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
  top: -0.5em;
  right: -0.5em;
  width: 1.3em;
  height: 1.3em;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 0.7em;
  font-weight: 700;
  color: var(--page-bg);
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
/* På papir: større felter, så der er plads til at skrive i hånden. */
@media print {
  .ladder {
    max-width: 600px;
    font-size: 28px;
    grid-template-columns: 1fr 56px 1fr;
  }
  .side,
  .eq {
    height: 92px;
  }
  .step-row {
    padding: 14px 0;
  }
  .step-row .cell {
    min-width: 150px;
    height: 70px;
    border-width: 2px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .target {
    animation: none;
  }
}
</style>
