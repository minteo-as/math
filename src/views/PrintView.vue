<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import FractionView from '../components/FractionView.vue'
import PuzzleGrid from '../components/PuzzleGrid.vue'
import { LEVELS, levelInfo, ruleText, topicInfo } from '../engine/levels'
import type { CellKey } from '../engine/types'
import { puzzleById, puzzlesForLevel } from '../puzzles'

/** `target` er enten en bane ("H3-05") eller et helt niveau ("H3"). */
const props = defineProps<{ target: string }>()

const single = puzzleById(props.target)
const levelCode = single?.level ?? (LEVELS.some((l) => l.code === props.target) ? props.target : null)
const level = levelCode ? levelInfo(levelCode) : null
const topic = level ? topicInfo(level.topic) : null
const all = levelCode ? puzzlesForLevel(levelCode) : []

const choice = ref(single ? single.id : 'alle')
const withAnswers = ref(true)
const chosen = computed(() => (choice.value === 'alle' ? all : all.filter((p) => p.id === choice.value)))
const noCells = new Set<CellKey>()

const back = single
  ? { name: 'game', params: { id: single.id } }
  : { name: 'level', params: { level: levelCode ?? '' } }

const instruction = computed(() =>
  level?.form === 'expr'
    ? 'Skriv udtrykkene fra boksen i de tomme felter, så alle regnestykker går op – både vandret og lodret. Ikke alle udtryk skal bruges.'
    : 'Skriv tallene fra boksen i de tomme felter, så alle regnestykker går op – både vandret og lodret. Ikke alle tal skal bruges.',
)

// Titlen bliver filnavnet, hvis man "udskriver" til PDF.
const oldTitle = document.title
if (level) document.title = `Matkryds – ${topic?.title} niveau ${level.number} – opgaveark`
onBeforeUnmount(() => (document.title = oldTitle))

function print() {
  window.print()
}
</script>

<template>
  <div class="page print-page">
    <header class="topbar no-print">
      <RouterLink class="icon-btn" :to="back" aria-label="Tilbage">←</RouterLink>
      <div class="title">
        <strong>Udskriv opgaveark</strong>
        <span v-if="level">{{ topic?.title }} · Niveau {{ level.number }}: {{ level.title }}</span>
      </div>
      <span class="icon-btn spacer" aria-hidden="true"></span>
    </header>

    <p v-if="!level" class="no-print">Banen eller niveauet findes ikke.</p>

    <template v-else>
      <div class="options no-print">
        <label>
          Baner
          <select v-model="choice">
            <option value="alle">Alle {{ all.length }} baner</option>
            <option v-for="p in all" :key="p.id" :value="p.id">Bane {{ p.index }}</option>
          </select>
        </label>
        <label class="check"><input v-model="withAnswers" type="checkbox" /> Facit til sidst</label>
        <button type="button" class="primary" @click="print">Udskriv</button>
      </div>

      <section v-for="p in chosen" :key="p.id" class="sheet">
        <header class="sheet-head">
          <p class="sheet-title">
            <strong>Matkryds</strong> · {{ topic?.title }} · Niveau {{ level.number }}: {{ level.title }} ·
            <strong>Bane {{ p.index }}</strong>
          </p>
          <p class="name">Navn: <span class="line"></span> Dato: <span class="line short"></span></p>
        </header>
        <p class="instruction">{{ instruction }}</p>
        <p v-if="ruleText(level, p)" class="instruction">{{ ruleText(level, p) }}</p>
        <div class="board">
          <PuzzleGrid
            :puzzle="p"
            :board="{}"
            :locked="noCells"
            :wrong-equations="[]"
            :hint-equation="null"
            :hint-cell="null"
            :solved="false"
            :can-drop="false"
            :print-unit="90"
            :print-height="620"
          />
        </div>
        <div class="tiles" aria-label="Brikker">
          <span v-for="(t, i) in p.tiles" :key="i" class="tile"><FractionView :value="t" :fit="false" /></span>
        </div>
      </section>

      <section v-if="withAnswers" class="answers">
        <h2>Facit · {{ topic?.title }} · Niveau {{ level.number }}</h2>
        <div class="answer-grid">
          <div v-for="p in chosen" :key="p.id" class="answer">
            <h3>Bane {{ p.index }}</h3>
            <div class="board">
              <PuzzleGrid
                :puzzle="p"
                :board="p.solutions[0]"
                :locked="noCells"
                :wrong-equations="[]"
                :hint-equation="null"
                :hint-cell="null"
                :solved="false"
                :can-drop="false"
                :print-unit="level.form === 'expr' ? 64 : 40"
                :print-height="420"
              />
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
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
.spacer {
  visibility: hidden;
}
.options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-bottom: 16px;
}
.options select {
  font: inherit;
  margin-left: 6px;
  padding: 6px 8px;
  border-radius: 8px;
}
.options .primary {
  margin-left: auto;
}
.sheet,
.answers {
  background: var(--surface);
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
}
.sheet-head p {
  margin: 0 0 6px;
}
.sheet-title {
  font-size: 15px;
}
.name {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 15px;
}
.line {
  flex: 1;
  border-bottom: 1px solid currentColor;
}
.line.short {
  flex: 0 0 90px;
}
.instruction {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--muted);
}
/* Brættet skaleres efter rammens bredde (se printUnit i PuzzleGrid). */
.board {
  container-type: inline-size;
  margin: 14px 0;
}
.tiles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border: 1px dashed var(--line);
  border-radius: 10px;
  font-size: 16px;
}
.tile {
  min-width: 48px;
  height: 48px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--tile-border);
  border-radius: 6px;
}
.answers h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.answer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px 20px;
}
.answer h3 {
  margin: 0;
  font-size: 14px;
}
.answer .board {
  margin: 6px 0;
}

@media print {
  .no-print {
    display: none;
  }
  .sheet,
  .answers {
    background: none;
    border-radius: 0;
    padding: 0;
    margin: 0;
  }
  /* Én bane pr. side, facit på sine egne sider. */
  .sheet {
    break-after: page;
  }
  .answer {
    break-inside: avoid;
  }
  .instruction {
    color: #333;
  }
}
</style>
