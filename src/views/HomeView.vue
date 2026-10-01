<script setup lang="ts">
import { RouterLink } from 'vue-router'
import logo from '../assets/logo.png'
import { levelsForTopic, TOPICS } from '../engine/levels'
import { progress } from '../progress'
import { puzzlesForLevel } from '../puzzles'

function levelStars(level: string) {
  const puzzles = puzzlesForLevel(level)
  const earned = puzzles.reduce((sum, p) => sum + (progress.stars[p.id] ?? 0), 0)
  return { earned, max: puzzles.length * 3 }
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <img class="logo" :src="logo" alt="" width="76" height="76" />
      <div>
        <h1>Matkryds</h1>
        <p>Læg brikkerne, så alle regnestykker går op – både vandret og lodret.</p>
      </div>
    </header>

    <section v-for="t in TOPICS" :key="t.id" class="topic">
      <h2>{{ t.title }}</h2>
      <p class="topic-desc">{{ t.available ? t.description : 'Kommer snart.' }}</p>
      <ol v-if="t.available" class="levels">
        <li v-for="l in levelsForTopic(t.id)" :key="l.code">
          <RouterLink v-if="l.available" class="level" :to="{ name: 'level', params: { level: l.code } }">
            <span class="badge">{{ l.number }}</span>
            <span class="text">
              <strong>{{ l.title }}</strong>
              <span>{{ l.description }}</span>
            </span>
            <span class="score">★ {{ levelStars(l.code).earned }}/{{ levelStars(l.code).max }}</span>
          </RouterLink>
          <div v-else class="level disabled" aria-disabled="true">
            <span class="badge">{{ l.number }}</span>
            <span class="text">
              <strong>{{ l.title }}</strong>
              <span>Kommer snart</span>
            </span>
          </div>
        </li>
      </ol>
    </section>

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
.hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 8px 0 22px;
}
/* Samme ikon som på hjemmeskærmen (design/ikon.svg). */
.logo {
  flex: none;
  width: 76px;
  height: 76px;
  border-radius: 22%;
  box-shadow: 0 3px 10px rgb(0 0 0 / 0.15);
}
.hero h1 {
  margin: 0 0 2px;
  font-size: 30px;
}
.hero p {
  margin: 0;
  color: var(--muted);
}
.topic + .topic {
  margin-top: 28px;
}
.topic h2 {
  margin: 0;
  font-size: 22px;
}
.topic-desc {
  margin: 2px 0 12px;
  color: var(--muted);
  font-size: 15px;
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
