<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import StarRow from '../components/StarRow.vue'
import { LEVELS } from '../engine/levels'
import { progress } from '../progress'
import { puzzlesForLevel } from '../puzzles'

const props = defineProps<{ level: number }>()
const info = computed(() => LEVELS.find((l) => l.level === props.level))
const puzzles = computed(() => puzzlesForLevel(props.level))
</script>

<template>
  <div class="page">
    <header class="topbar">
      <RouterLink class="icon-btn" to="/" aria-label="Til forsiden">←</RouterLink>
      <div class="title">
        <strong>Niveau {{ level }}</strong>
        <span v-if="info">{{ info.title }}</span>
      </div>
      <span class="icon-btn spacer" aria-hidden="true"></span>
    </header>

    <template v-if="info && puzzles.length">
      <p class="desc">{{ info.description }} <span class="example">Fx {{ info.example }}</span></p>
      <ol class="puzzles">
        <li v-for="p in puzzles" :key="p.id">
          <RouterLink :to="{ name: 'game', params: { id: p.id } }" class="puzzle" :class="{ done: progress.stars[p.id] }">
            <span class="no">{{ p.index }}</span>
            <StarRow :stars="progress.stars[p.id] ?? 0" />
          </RouterLink>
        </li>
      </ol>
    </template>
    <p v-else>Der er ingen baner på dette niveau endnu.</p>
  </div>
</template>

<style scoped>
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
.spacer {
  visibility: hidden;
}
.desc {
  color: var(--muted);
  text-align: center;
}
.example {
  display: block;
  margin-top: 4px;
  font-weight: 700;
  color: var(--ink);
}
.puzzles {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 10px;
}
.puzzle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px 10px;
  border-radius: 12px;
  background: var(--surface);
  color: inherit;
  text-decoration: none;
  border: 2px solid transparent;
}
.puzzle:hover,
.puzzle:focus-visible {
  border-color: var(--accent);
}
.puzzle.done {
  background: var(--given-bg);
}
.no {
  font-size: 22px;
  font-weight: 700;
}
.puzzle :deep(.stars) {
  font-size: 14px;
}
</style>
