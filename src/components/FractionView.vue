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
    /** Sæt parentes om et negativt helt tal, fx 5 − (−3). */
    negParen?: boolean
  }>(),
  { paren: false, fit: true, negParen: false },
)

/** Skal udtrykket i parentes her? Kun udtryk med flere led, og kun hvor feltet beder om det. */
const wrapped = computed(() => props.paren && isExpr(props.value) && termCount(props.value.c) > 1)

/** Negativt helt tal, der skal i parentes. */
const negWrapped = computed(() => {
  const v = props.value
  return props.negParen && !isExpr(v) && v.d === 1 && v.n < 0 && v.form === 'frac'
})

// Skærmlæsere skal høre den samme parentes, som står på skærmen – ellers ændres betydningen.
const label = computed(() =>
  wrapped.value || negWrapped.value ? `(${valueText(props.value)})` : valueText(props.value),
)

/** Udtryk vises som én tekst uden mellemrum, fx "x²+6x+9". */
const expr = computed(() => {
  const v = props.value
  if (!isExpr(v)) return null
  const text = exprText(v.c, true)
  return wrapped.value ? `(${text})` : text
})

const p = computed(() => (isExpr(props.value) ? null : parts(props.value)))

/**
 * Hele tal skaleres efter længden, så fx (−93) kan være i et smalt felt.
 * Korte tal (som −4 eller 48) beholder den normale størrelse.
 */
const intStyle = computed(() => {
  const v = props.value
  if (!props.fit || isExpr(v) || v.d !== 1 || v.form !== 'frac') return undefined
  // Et ciffer tæller 1, minustegnet er lidt bredere, og parenteserne er smalle.
  const width = String(Math.abs(v.n)).length + (v.n < 0 ? 1.1 : 0) + (negWrapped.value ? 1.2 : 0)
  const size = Math.min(1.4, 3.3 / width)
  return size < 1.4 ? { '--num-size': `${size.toFixed(2)}em` } : undefined
})

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
  <span class="num" :class="{ 'neg-paren': negWrapped }" :style="intStyle" :aria-label="label" role="img">
    <span v-if="negWrapped" class="paren">(</span>
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
    <span v-if="negWrapped" class="paren">)</span>
  </span>
</template>

<style scoped>
.neg-paren {
  gap: 0.02em;
}
.paren {
  font-size: var(--num-size, 1.4em);
  font-weight: 400;
}
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
