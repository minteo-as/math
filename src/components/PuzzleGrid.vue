<script setup lang="ts">
import { computed, ref } from 'vue'
import { OP_SYMBOL } from '../engine/fraction'
import { levelInfo } from '../engine/levels'
import type { Board } from '../engine/evaluate'
import { cellKey, type CellKey, type Puzzle } from '../engine/types'
import FractionView from './FractionView.vue'
import { moveFocus } from '../keyboardNav'

const props = defineProps<{
  puzzle: Puzzle
  board: Board
  locked: Set<CellKey>
  wrongEquations: number[]
  hintEquation: number | null
  hintCell: CellKey | null
  solved: boolean
  canDrop: boolean
  /**
   * Til udskrift: højst så mange px pr. felt, så bredt som rammen tillader (rammen skal have
   * container-type: inline-size) og så hele brættet højst er printHeight px højt.
   * Uden printUnit bruges skærmens regler.
   */
  printUnit?: number
  printHeight?: number
}>()

const emit = defineEmits<{
  /** `keyboard`: trykket kom fra tastaturet (Enter/mellemrum), ikke fra mus eller finger. */
  tapCell: [cell: CellKey, keyboard: boolean]
  dragStart: [event: PointerEvent, tile: number]
}>()

// ---------- Tastatur ----------
// Brættet er ét stop med Tab; piletasterne flytter rundt mellem felterne ("roving tabindex").

const gridEl = ref<HTMLElement | null>(null)
const active = ref<CellKey | null>(null)

const blankKeys = computed(() => props.puzzle.cells.filter((c) => c.kind === 'blank').map((c) => cellKey(c.r, c.c)))
/** Det felt, Tab lander på. */
const tabCell = computed(() =>
  active.value && blankKeys.value.includes(active.value) ? active.value : blankKeys.value[0],
)

function cellButtons(): HTMLElement[] {
  return [...(gridEl.value?.querySelectorAll<HTMLElement>('button[data-cell]') ?? [])]
}

function onKeydown(event: KeyboardEvent) {
  moveFocus(event, cellButtons())
}

/** Flyt fokus til et felt (bruges, når man har valgt en brik med tastaturet). */
function focusCell(key: CellKey) {
  cellButtons()
    .find((el) => el.dataset.cell === key)
    ?.focus()
}

defineExpose({ focusCell, activeCell: () => active.value })

/**
 * Tal står altid i lige rækker/kolonner, regnetegn og = i ulige.
 * Derfor kan de ulige kolonner og rækker være smallere, så tallene får mere plads.
 */
const OP_RATIO = 0.62
const track = (n: number) =>
  Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'var(--unit)' : `calc(var(--unit) * ${OP_RATIO})`)).join(' ')
/** Mindste feltstørrelse, når brættet skrumpes for at passe i højden – så tal kan læses og rammes. */
const MIN_UNIT = 40
const gridStyle = computed(() => {
  const { cols, rows } = props.puzzle
  const units = Math.ceil(cols / 2) + OP_RATIO * Math.floor(cols / 2)
  const rowUnits = Math.ceil(rows / 2) + OP_RATIO * Math.floor(rows / 2)
  // Så stort som bredden tillader – men mindre, hvis brættet ellers ikke kan være der i højden
  // (100cqh er højden af brættets ramme, se GameView). Aldrig under MIN_UNIT; så scroller brættet.
  const byWidth = `calc((min(100vw, var(--page-max)) - 32px) / ${units})`
  const byHeight = `calc((100cqh - 4px) / ${rowUnits.toFixed(2)})`
  const unit = props.printUnit
    ? `min(${props.printUnit}px, calc(100cqw / ${units.toFixed(2)}), ${((props.printHeight ?? 10000) / rowUnits).toFixed(1)}px)`
    : `min(64px, ${byWidth}, max(${MIN_UNIT}px, ${byHeight}))`
  return {
    '--unit': unit,
    gridTemplateColumns: track(cols),
    gridTemplateRows: track(rows),
  }
})

/**
 * Felter, hvor et udtryk med flere led skal i parentes for at blive læst rigtigt:
 * begge led i gange og division, og leddet efter et minus.
 */
const parenCells = computed(() => {
  const set = new Set<CellKey>()
  for (const eq of props.puzzle.equations) {
    if (eq.op === '*' || eq.op === ':') set.add(eq.nums[0]).add(eq.nums[1])
    if (eq.op === '-') set.add(eq.nums[1])
  }
  return set
})

/** Hele tal: negative tal efter et regnetegn står i parentes, fx 5 − (−3). */
const negParenCells = computed(() =>
  levelInfo(props.puzzle.level).topic === 'hele'
    ? new Set(props.puzzle.equations.map((eq) => eq.nums[1]))
    : new Set<CellKey>(),
)

const wrongCells = computed(() => new Set(props.wrongEquations.flatMap((i) => props.puzzle.equations[i].cells)))
const hintCells = computed(
  () => new Set(props.hintEquation === null ? [] : props.puzzle.equations[props.hintEquation].cells),
)

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
  <div ref="gridEl" class="grid" :style="gridStyle">
    <template v-for="c in cells" :key="c.key">
      <button
        v-if="c.cell.kind === 'blank'"
        type="button"
        class="cell"
        :class="c.classes"
        :style="c.style"
        :data-cell="c.key"
        :tabindex="c.key === tabCell ? 0 : -1"
        :aria-label="c.tile === null ? 'Tomt felt' : 'Felt med brik – tryk for at fjerne'"
        @click="emit('tapCell', c.key, $event.detail === 0)"
        @focus="active = c.key"
        @keydown="onKeydown"
        @pointerdown="c.tile !== null && !c.classes.locked && emit('dragStart', $event, c.tile)"
      >
        <FractionView
          v-if="c.tile !== null"
          :value="puzzle.tiles[c.tile]"
          :paren="parenCells.has(c.key)"
          :neg-paren="negParenCells.has(c.key)"
        />
      </button>
      <div v-else class="cell" :class="c.classes" :style="c.style">
        <FractionView
          v-if="c.cell.kind === 'given'"
          :value="c.cell.value"
          :paren="parenCells.has(c.key)"
          :neg-paren="negParenCells.has(c.key)"
        />
        <span v-else-if="c.cell.kind === 'op'" class="symbol" :class="{ word: c.cell.op === 'af' }">{{
          OP_SYMBOL[c.cell.op]
        }}</span>
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
  justify-content: center;
  font-size: calc(var(--unit) * 0.34);
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
.symbol.word {
  font-size: 0.95em;
}
.cell-given {
  background: var(--given-bg);
}
.cell-blank {
  background: var(--blank-bg);
  cursor: pointer;
  touch-action: manipulation;
}
/* En lagt brik kan trækkes – så må fingeren ikke scrolle brættet. Tomme felter kan godt. */
.cell-blank.filled:not(.locked) {
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
@media (prefers-reduced-motion: reduce) {
  .target {
    animation: none;
  }
}
</style>
