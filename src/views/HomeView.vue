<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LEVELS } from '../engine/levels'
import { progress } from '../progress'
import { puzzlesForLevel } from '../puzzles'

function levelStars(level: number) {
  const puzzles = puzzlesForLevel(level)
  const earned = puzzles.reduce((sum, p) => sum + (progress.stars[p.id] ?? 0), 0)
  return { earned, max: puzzles.length * 3 }
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <h1>Brøkkryds</h1>
      <p>Læg brikkerne, så alle regnestykker går op – både vandret og lodret.</p>
    </header>

    <ol class="levels">
      <li v-for="l in LEVELS" :key="l.level">
        <RouterLink v-if="l.available" class="level" :to="{ name: 'level', params: { level: l.level } }">
          <span class="badge">{{ l.level }}</span>
          <span class="text">
            <strong>{{ l.title }}</strong>
            <span>{{ l.description }}</span>
          </span>
          <span class="score">★ {{ levelStars(l.level).earned }}/{{ levelStars(l.level).max }}</span>
        </RouterLink>
        <div v-else class="level disabled" aria-disabled="true">
          <span class="badge">{{ l.level }}</span>
          <span class="text">
            <strong>{{ l.title }}</strong>
            <span>Kommer snart</span>
          </span>
        </div>
      </li>
    </ol>

    <details class="howto">
      <summary>Sådan spiller du</summary>
      <ul>
        <li>Træk en brik til et tomt felt – eller tryk på brikken og derefter på feltet.</li>
        <li>Tryk på en lagt brik for at lægge den tilbage.</li>
        <li>Ikke alle brikker skal bruges. Nogle af dem er svar, man får, hvis man laver en typisk fejl.</li>
        <li>Tryk <strong>Tjek</strong>, når alle felter er udfyldt. Et tjek med fejl koster en stjerne.</li>
        <li>Hints koster også stjerner – men det er bedre at bruge et hint end at gætte.</li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.hero h1 {
  margin: 8px 0 4px;
  font-size: 34px;
}
.hero p {
  margin: 0 0 20px;
  color: var(--muted);
}
.levels {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.level {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  background: var(--surface);
  color: inherit;
  text-decoration: none;
  border: 2px solid transparent;
}
a.level:hover,
a.level:focus-visible {
  border-color: var(--accent);
}
.level.disabled {
  opacity: 0.55;
}
.badge {
  flex: none;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--given-bg);
  border: 1px solid var(--cell-border);
  font-weight: 700;
  font-size: 20px;
}
.text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.text span {
  color: var(--muted);
  font-size: 14px;
}
.score {
  flex: none;
  color: var(--star);
  font-weight: 700;
  font-size: 14px;
}
.howto {
  margin-top: 24px;
}
.howto summary {
  cursor: pointer;
  font-weight: 700;
}
.howto li + li {
  margin-top: 6px;
}
</style>
