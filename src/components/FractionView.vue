<script setup lang="ts">
import { computed } from 'vue'
import { parts } from '../engine/fraction'
import { exprText, isExpr, termCount, valueText, type Token } from '../engine/value'

const props = withDefaults(
  defineProps<{
    value: Token
    /** Sæt parentes om udtryk med flere led (bestemmes af feltet, ikke af brikken). */
    paren?: boolean
    /** Skru skriften ned, så udtrykket kan være i et felt med fast bredde. */
    fit?: boolean
  }>(),
  { paren: false, fit: true },
)

/** Skal udtrykket i parentes her? Kun udtryk med flere led, og kun hvor feltet beder om det. */
const wrapped = computed(() => props.paren && isExpr(props.value) && termCount(props.value.c) > 1)

// Skærmlæsere skal høre den samme parentes, som står på skærmen – ellers ændres betydningen.
const label = computed(() => (wrapped.value ? `(${valueText(props.value)})` : valueText(props.value)))

/** Udtryk vises som én tekst uden mellemrum, fx "x²+6x+9". */
const expr = computed(() => {
  const v = props.value
  if (!isExpr(v)) return null
  const text = exprText(v.c, true)
  return wrapped.value ? `(${text})` : text
})

const p = computed(() => (isExpr(props.value) ? null : parts(props.value)))

/** Lange tekster gøres mindre, så de kan være i feltet. */
function sizeClass(text: string): string {
  return text.length >= 9 ? 'xlong' : text.length >= 5 ? 'long' : ''
}

/**
 * Udtryk skaleres efter længden, så de altid kan være i et felt.
 * Et felt er ca. 2,9 gange skriftstørrelsen bredt, og et fed tegn ca. 0,62 af den.
 */
function exprSize(text: string): string {
  // Minustegnet er bredt, ² er smalt.
  const width = [...text].reduce((w, ch) => w + (ch === '−' ? 1.35 : ch === '²' ? 0.55 : 1), 0)
  // På brikkerne i bunken må teksten ikke blive for lille – de bliver i stedet bredere.
  const min = props.fit ? 0 : 0.72
  return `${Math.max(min, Math.min(1.1, 3.8 / width)).toFixed(2)}em`
}
</script>

<template>
  <span class="num" :aria-label="label" role="img">
    <span v-if="expr !== null" class="text" :style="{ fontSize: exprSize(expr) }">{{ expr }}</span>
    <template v-else-if="p">
      <span v-if="p.negative" class="sign">−</span>
      <span v-if="p.text !== null" class="text" :class="sizeClass(p.text)">{{ p.text }}</span>
      <span v-if="p.whole !== null" class="whole">{{ p.whole }}</span>
      <span v-if="p.num !== null" class="frac">
        <span class="top">{{ p.num }}</span>
        <span class="bottom">{{ p.den }}</span>
      </span>
    </template>
  </span>
</template>

<style scoped>
.num {
  display: inline-flex;
  align-items: center;
  gap: 0.08em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}
.sign,
.whole {
  font-size: var(--num-size, 1.4em);
  font-weight: 700;
}
.text {
  font-size: 1.1em;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.text.long {
  font-size: 0.85em;
}
.text.xlong {
  font-size: 0.68em;
}
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: var(--frac-size, 0.95em);
  font-weight: 700;
}
.top {
  padding: 0 0.12em 0.08em;
  border-bottom: 0.11em solid currentColor;
}
.bottom {
  padding: 0.08em 0.12em 0;
}
</style>
