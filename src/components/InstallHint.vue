<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import logo from '../assets/logo.png'
import { dismissInstallHint, shouldShowInstallHint } from '../installHint'

/**
 * Forslag på forsiden: læg spillet på hjemmeskærmen (kun i browseren på iPhone/iPad, se
 * installHint.ts). iOS kan ikke installere siden fra et script, så det er en vejledning
 * med tegninger af de tre trin i Safari.
 */
const visible = ref(shouldShowInstallHint())
const open = ref(false)
const sheet = ref<HTMLElement | null>(null)
const showButton = ref<HTMLButtonElement | null>(null)

function notNow() {
  dismissInstallHint()
  visible.value = false
}

function show() {
  open.value = true
  // Fokus på selve arket, så det står øverst (fokus på knappen nederst ville rulle ned).
  nextTick(() => sheet.value?.focus())
}

function close() {
  open.value = false
  nextTick(() => showButton.value?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) close()
}
window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section v-if="visible" class="install" aria-labelledby="install-title">
    <div class="install-text">
      <h2 id="install-title">Spil Matkryds som en app</h2>
      <p>Læg spillet på hjemmeskærmen. Så fylder det hele skærmen og virker også uden net.</p>
      <div class="install-actions">
        <button ref="showButton" type="button" class="primary" @click="show">Vis mig hvordan</button>
        <button type="button" class="link" @click="notNow">Ikke nu</button>
      </div>
    </div>
  </section>

  <div v-if="open" class="backdrop" @click.self="close">
    <div ref="sheet" class="sheet" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="sheet-title">
      <h2 id="sheet-title">Læg Matkryds på hjemmeskærmen</h2>
      <ol class="steps">
        <li>
          <!-- Safaris værktøjslinje: ••• og Del-knappen -->
          <div class="mock bar" aria-hidden="true">
            <span class="address">math.sundskard.dk</span>
            <span class="key">•••</span>
            <span class="key hot">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 15V3M8 7l4-4 4 4M8 10H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2"
                />
              </svg>
            </span>
          </div>
          <p>
            Tryk på <strong>Del</strong>-knappen (firkanten med pilen). Kan du ikke se den, så tryk først på
            <strong>•••</strong> ved adressefeltet.
          </p>
        </li>
        <li>
          <!-- Nederst i Del-menuen: en række runde knapper, sidst "Se mere" -->
          <div class="mock actions" aria-hidden="true">
            <span class="action">
              <span class="round">
                <svg viewBox="0 0 24 24">
                  <rect x="8" y="8" width="11" height="12" rx="2" />
                  <path d="M5 15V6a2 2 0 0 1 2-2h7" />
                </svg>
              </span>
              Kopier
            </span>
            <span class="action">
              <span class="round"
                ><svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-4-5 4z" /></svg
              ></span>
              Bogmærker
            </span>
            <span class="action hot">
              <span class="round"
                ><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg
              ></span>
              Se mere
            </span>
          </div>
          <p>Rul ned i menuen, og tryk på <strong>Se mere</strong> nederst.</p>
        </li>
        <li>
          <!-- Listen under "Se mere" (de andre punkter er vist som grå streger) -->
          <div class="mock menu" aria-hidden="true">
            <span class="row"><span class="blank"></span></span>
            <span class="row hot">
              Føj til hjemmeskærm
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="4" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </span>
            <span class="row"><span class="blank short"></span></span>
          </div>
          <p>Vælg <strong>Føj til hjemmeskærm</strong> i listen.</p>
        </li>
        <li>
          <!-- Skærmen "Føj til hjemmeskærm" -->
          <div class="mock add" aria-hidden="true">
            <span class="add-head"><span>Annuller</span><span class="hot-text">Tilføj</span></span>
            <span class="add-app"><img :src="logo" alt="" width="34" height="34" />Matkryds</span>
          </div>
          <p>
            Tryk på <strong>Tilføj</strong>. Er der en kontakt, der hedder <strong>Åbn som webapp</strong>, så lad den
            være slået til.
          </p>
        </li>
      </ol>
      <p class="note">
        Åbn derefter spillet fra ikonet på hjemmeskærmen. Appen husker sine egne stjerner – dem, du har fået her i
        browseren, kommer ikke med over.
      </p>
      <button type="button" class="primary" @click="close">Forstået</button>
    </div>
  </div>
</template>

<style scoped>
.install {
  display: flex;
  margin: 0 0 24px;
  padding: 14px;
  border-radius: 14px;
  background: var(--surface);
  border: 2px solid var(--accent);
}
.install-text {
  flex: 1;
}
.install h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.install p {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
}
.install-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 12px;
}
.install-actions .primary {
  padding: 10px 16px;
}
.link {
  border: none;
  background: none;
  padding: 10px 4px;
  color: var(--muted);
  text-decoration: underline;
}

@media print {
  .install {
    display: none;
  }
}

/* ---------- Vejledningen (bundark som hjælpemenuen i spillet) ---------- */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.35);
}
.sheet {
  width: min(var(--page-max) - 32px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 18px 16px 16px;
  border-radius: 18px;
  background: var(--page-bg);
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.25);
}
.sheet:focus {
  outline: none;
}
.sheet h2 {
  margin: 0 0 12px;
  font-size: 19px;
}
.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
  display: grid;
  gap: 14px;
}
.steps li {
  counter-increment: step;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 6px 10px;
}
.steps li::before {
  content: counter(step);
  grid-row: span 2;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}
.steps p {
  margin: 0;
  font-size: 15px;
}
.note {
  margin: 16px 0 14px;
  font-size: 14px;
  color: var(--muted);
}
.sheet > .primary {
  width: 100%;
  padding: 12px;
}

/* Tegningerne af Safari: neutrale grå flader, det man skal trykke på er blåt. */
.mock {
  --ios-blue: #0a84ff;
  display: flex;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  font-size: 14px;
  user-select: none;
}
.mock svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.bar {
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
}
.address {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--page-bg);
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.key {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--muted);
  font-weight: 700;
}
.key.hot {
  color: #fff;
  background: var(--ios-blue);
}
.menu {
  flex-direction: column;
  overflow: hidden;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 12px;
  color: var(--muted);
}
.row + .row {
  border-top: 1px solid var(--line);
}
.blank {
  width: 60%;
  height: 10px;
  margin: 4px 0;
  border-radius: 5px;
  background: var(--line);
}
.blank.short {
  width: 40%;
}
.actions {
  justify-content: space-around;
  padding: 10px 6px 8px;
}
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}
.round {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--page-bg);
  border: 1px solid var(--line);
}
.action.hot {
  color: var(--ink);
  font-weight: 600;
}
.action.hot .round {
  color: #fff;
  background: var(--ios-blue);
  border-color: var(--ios-blue);
}
.row.hot {
  color: #fff;
  background: var(--ios-blue);
  font-weight: 600;
}
.add {
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 10px;
}
.add-head {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
}
.hot-text {
  padding: 2px 10px;
  border-radius: 8px;
  color: #fff;
  background: var(--ios-blue);
  font-weight: 600;
}
.add-app {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.add-app img {
  border-radius: 22%;
}
</style>
