<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import FractionView from '../components/FractionView.vue'
import PrintIcon from '../components/PrintIcon.vue'
import LadderBoard from '../components/LadderBoard.vue'
import PuzzleGrid from '../components/PuzzleGrid.vue'
import StarRow from '../components/StarRow.vue'
import TileBank from '../components/TileBank.vue'
import { useGame } from '../composables/useGame'
import { ruleText as levelRuleText, topicInfo } from '../engine/levels'
import { isLadder, nextPuzzle, puzzleById } from '../puzzles'

const props = defineProps<{ id: string }>()
const router = useRouter()

const puzzle = puzzleById(props.id)
const game = puzzle ? useGame(puzzle) : null
const next = puzzle ? nextPuzzle(puzzle) : undefined

const topic = game ? topicInfo(game.level.topic) : null

const ruleText = computed(() => (game && puzzle ? levelRuleText(game.level, puzzle) : ''))

// ---------- Brættet scroller, resten står fast ----------

const boardWrap = ref<HTMLElement | null>(null)
const bottom = ref<HTMLElement | null>(null)

/** Blød scroll – men ikke for dem, der har bedt om færre animationer. */
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** Vis et felt på brættet, hvis det er scrollet ud af syne. */
function reveal(selector: string, block: ScrollLogicalPosition) {
  nextTick(() =>
    boardWrap.value?.querySelector(selector)?.scrollIntoView({ block, inline: 'nearest', behavior: scrollBehavior() }),
  )
}

/** Ny besked eller nyt hint øverst i bunden: rul bunden op, så teksten kan ses. */
function showMessages() {
  nextTick(() => bottom.value?.scrollTo({ top: 0, behavior: scrollBehavior() }))
}

if (game) {
  watch(game.hintTarget, (t) => t && reveal('.cell.target', 'center'))
  watch(game.feedback, (f) => f && f.wrongEquations.length > 0 && reveal('.cell.wrong', 'nearest'))
  watch([game.feedback, game.notice, game.hintSteps, game.hintTarget], (now, before) => {
    if (now.some((v, i) => v && v !== before[i])) showMessages()
  })
}

// ---------- Hjælpemenuen ("?") ----------

const helpOpen = ref(false)
const helpButton = ref<HTMLButtonElement | null>(null)
const helpMenu = ref<HTMLElement | null>(null)

function openHelp() {
  helpOpen.value = true
  nextTick(() => helpMenu.value?.querySelector<HTMLButtonElement>('button')?.focus())
}

function closeHelp() {
  if (!helpOpen.value) return
  helpOpen.value = false
  nextTick(() => helpButton.value?.focus())
}

// ---------- Nedtoning bag hjælpemenuen og "Flot klaret!" ----------
// Safari på iPhone farver statuslinjen ud fra siden, når den indlæses, og ændrer den ikke
// bagefter. En nedtoning helt op til kanten giver derfor en lys statuslinje over en mørk
// topbjælke. Så nedtoningen starter under topbjælken (--dim-top, se ::before i CSS).
const topbar = ref<HTMLElement | null>(null)
const dimTop = ref('0px')
watch(
  () => helpOpen.value || !!game?.solved.value,
  (dimmed) => {
    if (dimmed) dimTop.value = `${topbar.value?.getBoundingClientRect().bottom ?? 0}px`
  },
  { immediate: true, flush: 'post' },
)

/** Vælg et hint og luk menuen. */
function useHint(hint: () => void) {
  hint()
  closeHelp()
}

// Under træk: hold brikken nær kanten af brættet for at scrolle.
const EDGE = 48
let edgeSpeed = 0
let edgeFrame = 0

function edgeScroll() {
  if (!boardWrap.value || edgeSpeed === 0) {
    edgeFrame = 0
    return
  }
  boardWrap.value.scrollTop += edgeSpeed
  edgeFrame = requestAnimationFrame(edgeScroll)
}

function updateEdge(y: number) {
  const r = boardWrap.value?.getBoundingClientRect()
  edgeSpeed = 0
  if (r && y >= r.top && y < r.top + EDGE) edgeSpeed = -Math.ceil((r.top + EDGE - y) / 4)
  else if (r && y <= r.bottom && y > r.bottom - EDGE) edgeSpeed = Math.ceil((y - (r.bottom - EDGE)) / 4)
  if (edgeSpeed !== 0 && !edgeFrame) edgeFrame = requestAnimationFrame(edgeScroll)
}

function stopEdge() {
  edgeSpeed = 0
  cancelAnimationFrame(edgeFrame)
  edgeFrame = 0
}

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
      updateEdge(e.clientY)
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
    stopEdge()
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

// ---------- Tastatur ----------
// Vælg en brik med Enter → fokus hopper til et tomt felt. Læg den med Enter → fokus tilbage
// til bunken (eller til Tjek, når alle felter er udfyldt). Piletaster flytter rundt.

/** Brættet – krydset (PuzzleGrid) eller ligningstrappen (LadderBoard); begge har samme metoder. */
const gridRef = ref<{ focusCell(key: string): void; activeCell(): string | null } | null>(null)
const bankRef = ref<InstanceType<typeof TileBank> | null>(null)
const checkButton = ref<HTMLButtonElement | null>(null)

/** Det felt, fokus skal hen til: det seneste felt, hvis det er tomt – ellers det første tomme. */
function nextEmptyCell(): string | undefined {
  if (!game) return undefined
  const last = gridRef.value?.activeCell()
  if (last && game.board[last] === null && !game.locked.has(last)) return last
  return Object.keys(game.board).find((k) => game.board[k] === null && !game.locked.has(k)) ?? last ?? undefined
}

function tapTile(tile: number, keyboard = false) {
  if (!game || suppressClick) return
  game.tapTile(tile)
  if (keyboard && game.selected.value === tile) {
    const cell = nextEmptyCell()
    if (cell) nextTick(() => gridRef.value?.focusCell(cell))
  }
}

function tapCell(cell: string, keyboard = false) {
  if (!game || suppressClick) return
  const placing = game.selected.value !== null
  game.tapCell(cell)
  if (!keyboard || !placing) return
  nextTick(() => {
    if (game.complete.value) checkButton.value?.focus()
    else bankRef.value?.focusTile()
  })
}

/** Escape fortryder en valgt brik og sætter fokus tilbage på den. */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !game || helpOpen.value || game.selected.value === null) return
  const tile = game.selected.value
  game.selected.value = null
  bankRef.value?.focusTile(tile)
}
window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
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

  <div v-else class="page game" :class="{ 'many-tiles': game.tiles.length > 9 }" :style="{ '--dim-top': dimTop }">
    <header ref="topbar" class="topbar">
      <RouterLink class="icon-btn" :to="{ name: 'level', params: { level: puzzle.level } }" aria-label="Tilbage"
        >←</RouterLink
      >
      <div class="title">
        <strong>Niveau {{ game.level.number }} · Bane {{ puzzle.index }}</strong>
        <span>{{ topic?.title }}: {{ game.level.title }}</span>
      </div>
      <RouterLink
        class="icon-btn"
        :to="{ name: 'print', params: { target: puzzle.id } }"
        aria-label="Udskriv som opgaveark"
        title="Udskriv som opgaveark"
      >
        <PrintIcon />
      </RouterLink>
      <button type="button" class="icon-btn" aria-label="Start forfra" title="Start forfra" @click="game.restart()">
        ↻
      </button>
    </header>

    <p v-if="ruleText" class="rule">{{ ruleText }}</p>

    <div ref="boardWrap" class="board-wrap">
      <LadderBoard
        v-if="isLadder(puzzle)"
        :puzzle="puzzle"
        ref="gridRef"
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
      <PuzzleGrid
        v-else
        :puzzle="puzzle"
        ref="gridRef"
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

    <div ref="bottom" class="bottom">
      <section v-if="game.feedback.value && !game.solved.value" class="panel feedback" aria-live="polite">
        <p class="summary">✗ {{ game.feedback.value.summary }}</p>
        <ul v-if="game.feedback.value.messages.length">
          <li v-for="m in game.feedback.value.messages" :key="m">{{ m }}</li>
        </ul>
      </section>
      <p v-else-if="game.notice.value" class="panel notice" aria-live="polite">{{ game.notice.value }}</p>

      <section v-if="game.hintSteps.value" class="panel hint-steps" aria-live="polite">
        <p class="summary">{{ game.hintTitle.value }}</p>
        <ol>
          <li v-for="line in game.hintSteps.value" :key="line">{{ line }}</li>
        </ol>
      </section>
      <p v-else-if="game.hintTarget.value" class="panel hint-steps" aria-live="polite">
        {{
          game.isLadder
            ? 'Start med det markerede trin.'
            : game.hintTarget.value.single
              ? 'Start med den markerede ligning – der mangler kun ét tal.'
              : 'Kig på den markerede ligning og brikkerne: hvilke passer?'
        }}
      </p>

      <div class="dock">
        <TileBank
          ref="bankRef"
          class="dock-bank"
          :tiles="game.tiles"
          :bank="game.bank.value"
          :selected="game.selected.value"
          :dragging="drag.tile"
          :disabled="game.solved.value"
          @tap-tile="tapTile"
          @tap-bank="tapBank"
          @drag-start="startDrag"
        />
        <div class="side">
          <div class="potential" :aria-label="`Du kan få ${game.potentialStars.value} stjerner`">
            <StarRow :stars="game.potentialStars.value" />
          </div>
          <button
            ref="checkButton"
            type="button"
            class="primary check"
            :disabled="!game.complete.value || game.solved.value"
            @click="game.check()"
          >
            Tjek
          </button>
          <button
            ref="helpButton"
            type="button"
            class="help-btn"
            aria-label="Brug for hjælp?"
            aria-haspopup="dialog"
            :aria-expanded="helpOpen"
            :disabled="game.solved.value"
            @click="openHelp"
          >
            ?
          </button>
        </div>
      </div>
    </div>

    <div v-if="helpOpen" class="help-backdrop" @click.self="closeHelp" @keydown.esc="closeHelp">
      <div ref="helpMenu" class="help-menu" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <p id="help-title" class="help-title">Brug for hjælp?</p>
        <button type="button" @click="useHint(game.hintWhere)">Hvor starter jeg?<small>koster 1 ☆</small></button>
        <button type="button" @click="useHint(game.hintExplain)">Vis mellemregning<small>koster 1 ☆</small></button>
        <button v-if="game.level.form === 'expr'" type="button" @click="useHint(game.hintSubstitute)">
          Indsæt et tal<small>koster 1 ☆</small>
        </button>
        <button type="button" @click="useHint(game.hintPlace)">Placér en brik<small>højst 1 ★</small></button>
        <button type="button" class="help-close" @click="closeHelp">Luk</button>
      </div>
    </div>

    <div v-if="game.solved.value" class="overlay" role="dialog" aria-modal="true" aria-labelledby="done-title">
      <div class="dialog">
        <h2 id="done-title">Flot klaret!</h2>
        <StarRow :stars="game.stars.value" large />
        <p v-if="game.proof" class="proof">{{ game.proof }}</p>
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
      <FractionView :value="game.tiles[drag.tile]" />
    </div>
  </div>
</template>

<style scoped>
.game {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  --tile: 58px;
}
/* Mange brikker: mindre brikker og tættere bunke, så bunden ikke tager pladsen fra brættet. */
.game.many-tiles {
  --tile: 44px;
}
.many-tiles .dock .dock-bank {
  gap: 6px;
  padding: 10px 6px;
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
/* Brættet fylder pladsen mellem top og bund og scroller selv. Det går ud i sidemargenen,
   så ✗/✓-mærkerne i kanten ikke bliver skåret af. */
.board-wrap {
  flex: 1 1 0;
  min-height: 0;
  /* Brættet kan måle rammens højde (100cqh) og skrumpe, så det passer. */
  container-type: size;
  margin: 0 -16px;
  padding: 12px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-block: 1px solid var(--divider);
}
.bottom {
  flex: 0 0 auto;
  max-height: 55%;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.topbar,
.rule,
.bottom > * {
  flex: none;
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
.dock {
  display: flex;
  gap: 6px;
  align-items: stretch;
}
/* Bunken deler bredden med Tjek-kolonnen – lidt mindre luft, så 4 brikker kan stå på en række. */
.dock .dock-bank {
  flex: 1;
  min-width: 0;
  padding: 12px 8px;
}
.side {
  flex: none;
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.side .potential :deep(.stars) {
  font-size: 15px;
}
.check {
  flex: 1;
  align-self: stretch;
  min-height: 58px;
  padding: 0;
  border-radius: 14px;
  font-size: 16px;
}
.help-btn {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 20px;
  font-weight: 700;
  color: var(--muted);
}
.help-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  z-index: 15;
}
.help-menu {
  width: min(var(--page-max) - 32px, 100%);
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 12px 40px rgb(0 0 0 / 0.22);
}
.help-title {
  margin: 0;
  padding: 0 4px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
}
.help-menu button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  font-size: 16px;
  text-align: left;
}
.help-menu small {
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}
.help-menu .help-close {
  justify-content: center;
  color: var(--muted);
  border: none;
  background: none;
}
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 20;
}
/* Nedtoningen starter under topbjælken (se dimTop i scriptet). Laget, der fanger tryk,
   dækker stadig hele skærmen. */
.help-backdrop::before,
.overlay::before {
  content: '';
  position: absolute;
  inset: var(--dim-top) 0 0;
  z-index: -1;
  background: rgb(0 0 0 / 0.18);
}
.overlay::before {
  background: rgb(0 0 0 / 0.35);
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
.proof {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--ok-bg);
  color: var(--ok);
  font-weight: 600;
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
