import { computed, reactive, ref } from 'vue'
import { blankKeys, evaluateBoard, tokenKey, type Board, type BoardResult } from '../engine/evaluate'
import { pequals, tokenPoly, valueText } from '../engine/value'
import { explainSteps, findHintTarget, solutionValues, starsFor, substitutionHint, type HintTarget } from '../engine/hints'
import { levelInfo } from '../engine/levels'
import { MISCONCEPTION_TEXT } from '../engine/misconceptions'
import type { CellKey, Puzzle } from '../engine/types'
import { recordStars } from '../progress'

export interface Feedback {
  summary: string
  /** Ligninger der markeres som forkerte (tom i 'count'-tilstand). */
  wrongEquations: number[]
  messages: string[]
}

export function useGame(puzzle: Puzzle) {
  const level = levelInfo(puzzle.level)
  const blanks = blankKeys(puzzle)

  const board = reactive<Board>(Object.fromEntries(blanks.map((k) => [k, null])))
  /** Felter udfyldt af hintet "placér en brik" – kan ikke flyttes. */
  const locked = reactive(new Set<CellKey>())
  const selected = ref<number | null>(null)
  const result = ref<BoardResult | null>(null)
  const notice = ref<string | null>(null)
  const solved = ref(false)
  const stars = ref(0)

  // Fejl og hints tæller for hele banen – også hvis man starter forfra.
  const failedChecks = ref(0)
  const smallHints = ref(0)
  const placeHints = ref(0)
  const potentialStars = computed(() => starsFor(failedChecks.value, smallHints.value, placeHints.value))

  const hintTarget = ref<HintTarget | null>(null)
  const hintSteps = ref<string[] | null>(null)
  const hintTitle = ref('')

  const placed = computed(() => new Set(Object.values(board).filter((t): t is number => t !== null)))
  const bank = computed(() => puzzle.tiles.map((_, i) => i).filter((i) => !placed.value.has(i)))
  const complete = computed(() => blanks.every((k) => board[k] !== null))

  function cellOf(tile: number): CellKey | undefined {
    return blanks.find((k) => board[k] === tile)
  }

  function changed() {
    result.value = null
    notice.value = null
    selected.value = null
  }

  /** Læg en brik i et felt. Ligger der allerede en brik, byttes de. */
  function place(tile: number, cell: CellKey) {
    if (solved.value || locked.has(cell)) return
    const from = cellOf(tile)
    if (from === cell) return
    if (from && locked.has(from)) return
    const occupant = board[cell]
    if (from) board[from] = occupant
    board[cell] = tile
    changed()
  }

  function toBank(tile: number) {
    const from = cellOf(tile)
    if (!from || locked.has(from) || solved.value) return
    board[from] = null
    changed()
  }

  function tapTile(tile: number) {
    if (solved.value) return
    selected.value = selected.value === tile ? null : tile
  }

  function tapCell(cell: CellKey) {
    if (solved.value || locked.has(cell)) return
    if (selected.value !== null) {
      place(selected.value, cell)
    } else if (board[cell] !== null) {
      toBank(board[cell]!)
    }
  }

  function check() {
    if (solved.value) return
    if (!complete.value) {
      notice.value = 'Læg en brik i alle felter, før du tjekker.'
      return
    }
    const r = evaluateBoard(puzzle, board, level)
    result.value = r
    if (r.solved) {
      solved.value = true
      stars.value = potentialStars.value
      recordStars(puzzle.id, stars.value)
      hintTarget.value = null
      hintSteps.value = null
    } else {
      failedChecks.value++
    }
  }

  const feedback = computed<Feedback | null>(() => {
    const r = result.value
    if (!r) return null
    const messages: string[] = []
    const formMessages = () => {
      for (const eq of r.equations) {
        for (const issue of eq.formIssues) {
          const tile = puzzle.tiles[board[issue.cell]!]
          messages.push(`${valueText(tile)}: ${MISCONCEPTION_TEXT[issue.kind]}`)
        }
      }
    }
    if (r.solved) {
      formMessages()
      return { summary: 'Alle ligninger går op!', wrongEquations: [], messages: unique(messages) }
    }
    const wrong = r.equations.flatMap((e, i) => (e.status === 'wrong' ? [i] : []))
    const n = wrong.length
    const plural = n === 1 ? 'ligning er forkert' : 'ligninger er forkerte'
    if (level.feedback === 'count') {
      return { summary: `${n} ${plural}.`, wrongEquations: [], messages: [] }
    }
    if (level.feedback === 'explain') {
      for (const eq of r.equations) for (const hit of eq.trapHits) messages.push(MISCONCEPTION_TEXT[hit.kind])
    }
    formMessages()
    return { summary: `${n} ${plural} – de er markeret med rødt.`, wrongEquations: wrong, messages: unique(messages) }
  })

  // ---------- Hints ----------

  function hintWhere() {
    if (solved.value) return
    const target = findHintTarget(puzzle, board)
    if (!target) return
    smallHints.value++
    hintTarget.value = target
    hintSteps.value = null
  }

  function hintExplain() {
    if (solved.value) return
    const target = findHintTarget(puzzle, board)
    if (!target) return
    smallHints.value++
    hintTarget.value = target
    hintSteps.value = explainSteps(puzzle, target, level)
    hintTitle.value = 'Mellemregning for den markerede ligning'
  }

  /** Kun algebra: "Indsæt et tal" – hvad skal det manglende udtryk give for et bestemt x? */
  function hintSubstitute() {
    if (solved.value) return
    const target = findHintTarget(puzzle, board)
    if (!target || !target.single) return
    smallHints.value++
    hintTarget.value = target
    hintSteps.value = substitutionHint(puzzle, target)
    hintTitle.value = 'Sæt et tal ind for x'
  }

  function hintPlace() {
    if (solved.value) return
    const target = findHintTarget(puzzle, board)
    if (!target) return
    const truth = solutionValues(puzzle)
    const want = puzzle.tiles[puzzle.solutions[0][target.cell]]
    const isRightAt = (tile: number, cell: CellKey) => pequals(tokenPoly(puzzle.tiles[tile]), truth.get(cell)!)
    // Find en brik med den rigtige påskrift – helst fra bunken, ellers fra et felt hvor den ligger forkert.
    const candidates = puzzle.tiles
      .map((t, i) => ({ i, key: tokenKey(t) }))
      .filter(({ key }) => key === tokenKey(want))
      .map(({ i }) => i)
    const tile =
      candidates.find((i) => !placed.value.has(i)) ??
      candidates.find((i) => {
        const at = cellOf(i)
        return at !== undefined && !locked.has(at) && !isRightAt(i, at)
      })
    if (tile === undefined) return
    const from = cellOf(tile)
    if (from) board[from] = null
    board[target.cell] = tile
    locked.add(target.cell)
    placeHints.value++
    changed()
    hintTarget.value = null
    hintSteps.value = null
  }

  function restart() {
    for (const k of blanks) board[k] = null
    locked.clear()
    hintTarget.value = null
    hintSteps.value = null
    changed()
  }

  return {
    puzzle,
    level,
    board,
    locked,
    selected,
    bank,
    complete,
    solved,
    stars,
    potentialStars,
    feedback,
    notice,
    hintTarget,
    hintSteps,
    hintTitle,
    place,
    toBank,
    tapTile,
    tapCell,
    check,
    hintWhere,
    hintExplain,
    hintSubstitute,
    hintPlace,
    restart,
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}
