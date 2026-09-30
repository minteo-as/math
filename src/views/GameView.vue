<script setup lang="ts">
import { computed, onBeforeUnmount, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import FractionView from '../components/FractionView.vue'
import PuzzleGrid from '../components/PuzzleGrid.vue'
import StarRow from '../components/StarRow.vue'
import TileBank from '../components/TileBank.vue'
import { useGame } from '../composables/useGame'
import { topicInfo } from '../engine/levels'
import { nextPuzzle, puzzleById } from '../puzzles'

const props = defineProps<{ id: string }>()
const router = useRouter()

const puzzle = puzzleById(props.id)
const game = puzzle ? useGame(puzzle) : null
const next = puzzle ? nextPuzzle(puzzle) : undefined

const topic = game ? topicInfo(game.level.topic) : null

const ruleText = computed(() => {
  if (!game || !puzzle) return ''
  const l = game.level
  if (l.form === 'dec') {
    const hasPercent = puzzle.equations.some((e) => e.op === 'af')
    return hasPercent ? 'Procenter skrives med %, alle andre tal som decimaltal.' : ''
  }
  if (l.reduce === 'required') {
    return l.form === 'mixed' ? 'Svar skal være forkortede og skrevet som blandede tal.' : 'Svar skal være forkortede.'
  }
  return ''
})

// ---------- Træk og slip (virker med både mus og finger) ----------

const drag = reactive({ tile: null as number | null, x: 0, y: 0 })
let suppressClick = false
let cleanup: (() => void) | null = null

function startDrag(event: PointerEvent, tile: number) {
  if (!game || game.solved.value || event.button !== 0) return
  const startX = event.clientX
  const startY = event.clientY
  let active = false

  const move = (e: PointerEvent) => {
    if (!active && Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
      active = true
      drag.tile = tile
      game.selected.value = null
    }
    if (active) {
      drag.x = e.clientX
      drag.y = e.clientY
      e.preventDefault()
    }
  }
  const up = (e: PointerEvent) => {
    stop()
    if (!active) return
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-cell],[data-bank]')
    if (target?.dataset.cell) game.place(tile, target.dataset.cell)
    else if (target && 'bank' in target.dataset) game.toBank(tile)
    drag.tile = null
    // Browseren sender et klik efter pointerup – det skal ikke tælle som et tryk.
    suppressClick = true
    setTimeout(() => (suppressClick = false), 0)
  }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', cancel)
    cleanup = null
  }
  const cancel = () => {
    stop()
    drag.tile = null
  }
  window.addEventListener('pointermove', move, { passive: false })
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  cleanup = cancel
}

onBeforeUnmount(() => cleanup?.())

function tapTile(tile: number) {
  if (!suppressClick) game?.tapTile(tile)
}
function tapCell(cell: string) {
  if (!suppressClick) game?.tapCell(cell)
}
function tapBank() {
  if (!game || suppressClick) return
  game.selected.value = null
}

function goNext() {
  if (next) router.push({ name: 'game', params: { id: next.id } })
  else if (puzzle) router.push({ name: 'level', params: { level: puzzle.level } })
}
</script>

<template>
  <div v-if="!puzzle || !game" class="page">
    <p>Banen findes ikke.</p>
    <RouterLink to="/">Til forsiden</RouterLink>
  </div>

  <div v-else class="page game">
    <header class="topbar">
      <RouterLink class="icon-btn" :to="{ name: 'level', params: { level: puzzle.level } }" aria-label="Tilbage">←</RouterLink>
      <div class="title">
        <strong>Niveau {{ game.level.number }} · Bane {{ puzzle.index }}</strong>
        <span>{{ topic?.title }}: {{ game.level.title }}</span>
      </div>
      <button type="button" class="icon-btn" aria-label="Start forfra" title="Start forfra" @click="game.restart()">↻</button>
    </header>

    <p v-if="ruleText" class="rule">{{ ruleText }}</p>

    <div class="board-wrap">
      <PuzzleGrid
        :puzzle="puzzle"
        :board="game.board"
        :locked="game.locked"
        :wrong-equations="game.feedback.value?.wrongEquations ?? []"
        :hint-equation="game.hintTarget.value?.equation ?? null"
        :hint-cell="game.hintTarget.value?.cell ?? null"
        :solved="game.solved.value"
        :can-drop="drag.tile !== null || game.selected.value !== null"
        @tap-cell="tapCell"
        @drag-start="startDrag"
      />
    </div>

    <section v-if="game.feedback.value && !game.solved.value" class="panel feedback" aria-live="polite">
      <p class="summary">✗ {{ game.feedback.value.summary }}</p>
      <ul v-if="game.feedback.value.messages.length">
        <li v-for="m in game.feedback.value.messages" :key="m">{{ m }}</li>
      </ul>
    </section>
    <p v-else-if="game.notice.value" class="panel notice" aria-live="polite">{{ game.notice.value }}</p>

    <section v-if="game.hintSteps.value" class="panel hint-steps" aria-live="polite">
      <p class="summary">Mellemregning for den markerede ligning</p>
      <ol>
        <li v-for="line in game.hintSteps.value" :key="line">{{ line }}</li>
      </ol>
    </section>
    <p v-else-if="game.hintTarget.value" class="panel hint-steps" aria-live="polite">
      {{
        game.hintTarget.value.single
          ? 'Start med den markerede ligning – der mangler kun ét tal.'
          : 'Kig på den markerede ligning og brikkerne: hvilke passer?'
      }}
    </p>

    <TileBank
      :tiles="puzzle.tiles"
      :bank="game.bank.value"
      :selected="game.selected.value"
      :dragging="drag.tile"
      :disabled="game.solved.value"
      @tap-tile="tapTile"
      @tap-bank="tapBank"
      @drag-start="startDrag"
    />

    <div class="actions">
      <button type="button" class="primary" :disabled="!game.complete.value || game.solved.value" @click="game.check()">
        Tjek
      </button>
      <div class="potential" :aria-label="`Du kan få ${game.potentialStars.value} stjerner`">
        <StarRow :stars="game.potentialStars.value" />
      </div>
    </div>

    <details class="hints">
      <summary>Brug for hjælp?</summary>
      <div class="hint-buttons">
        <button type="button" :disabled="game.solved.value" @click="game.hintWhere()">
          Hvor starter jeg?<small>koster 1 ☆</small>
        </button>
        <button type="button" :disabled="game.solved.value" @click="game.hintExplain()">
          Vis mellemregning<small>koster 1 ☆</small>
        </button>
        <button type="button" :disabled="game.solved.value" @click="game.hintPlace()">
          Placér en brik<small>højst 1 ★</small>
        </button>
      </div>
    </details>

    <div v-if="game.solved.value" class="overlay" role="dialog" aria-modal="true" aria-labelledby="done-title">
      <div class="dialog">
        <h2 id="done-title">Flot klaret!</h2>
        <StarRow :stars="game.stars.value" large />
        <ul v-if="game.feedback.value?.messages.length" class="nudges">
          <li v-for="m in game.feedback.value.messages" :key="m">{{ m }}</li>
        </ul>
        <div class="dialog-actions">
          <RouterLink class="secondary" :to="{ name: 'level', params: { level: puzzle.level } }">Vælg bane</RouterLink>
          <button type="button" class="primary" @click="goNext">{{ next ? 'Næste bane' : 'Færdig' }}</button>
        </div>
      </div>
    </div>

    <div
      v-if="drag.tile !== null"
      class="drag-ghost"
      :style="{ left: `${drag.x}px`, top: `${drag.y}px` }"
      aria-hidden="true"
    >
      <FractionView :value="puzzle.tiles[drag.tile]" />
    </div>
  </div>
</template>

<style scoped>
.game {
  display: flex;
  flex-direction: column;
  gap: 14px;
  --tile: 58px;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  flex: 1;
  display: flex;
  flex-direction: column;
  text-align: center;
}
.title span {
  color: var(--muted);
  font-size: 14px;
}
.rule {
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}
.board-wrap {
  padding: 16px 0 8px;
  overflow: visible;
}
.panel {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 15px;
}
.panel ul,
.panel ol {
  margin: 6px 0 0;
  padding-left: 20px;
}
.panel li + li {
  margin-top: 4px;
}
.summary {
  margin: 0;
  font-weight: 700;
}
.feedback {
  background: var(--wrong-bg);
  border: 1px solid var(--wrong);
}
.notice {
  background: var(--surface);
}
.hint-steps {
  background: var(--hint-bg);
  border: 1px solid var(--hint-ring);
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.actions .primary {
  flex: 1;
}
.hints summary {
  cursor: pointer;
  color: var(--muted);
  padding: 4px 0;
}
.hint-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}
.hint-buttons button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  font-size: 14px;
}
.hint-buttons small {
  color: var(--muted);
  font-size: 12px;
}
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.35);
  z-index: 20;
}
.dialog {
  width: min(360px, 100%);
  padding: 24px;
  border-radius: 18px;
  background: var(--page-bg);
  text-align: center;
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.25);
}
.dialog h2 {
  margin: 0 0 8px;
}
.nudges {
  text-align: left;
  font-size: 14px;
  padding-left: 18px;
}
.dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.dialog-actions > * {
  flex: 1;
}
.drag-ghost {
  position: fixed;
  width: var(--tile);
  height: var(--tile);
  transform: translate(-50%, -60%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--tile) * 0.34);
  color: var(--tile-ink);
  background: var(--tile-bg);
  border: 2px solid var(--accent);
  border-radius: 6px;
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.2);
  pointer-events: none;
  z-index: 30;
}
</style>
