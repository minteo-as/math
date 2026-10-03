/**
 * Emner, niveauer og deres regler – samlet ét sted, så gameplay kan justeres her.
 */
import type { LadderPuzzle, Puzzle } from './types'

/**
 * Hvad sker der, hvis eleven lægger en brik med den rigtige værdi,
 * men på en forkert skriveform (uforkortet, ikke blandet tal, decimal i stedet for procent)?
 *  - 'nudge':    ligningen tæller som rigtig, men spillet påpeger det
 *  - 'required': ligningen tæller som forkert
 */
export type ReduceRule = 'nudge' | 'required'

/**
 * Hvor meget et tjek afslører:
 *  - 'explain':   hvilke ligninger der er forkerte + forklaring på typiske fejl
 *  - 'equations': hvilke ligninger der er forkerte
 *  - 'count':     kun hvor mange ligninger der er forkerte
 */
export type FeedbackMode = 'explain' | 'equations' | 'count'

export type TopicId = 'hele' | 'broek' | 'procent' | 'ligninger' | 'algebra'

export interface Topic {
  id: TopicId
  title: string
  description: string
  available: boolean
}

export const TOPICS: Topic[] = [
  {
    id: 'hele',
    title: 'Hele tal',
    description: 'Plus, minus, gange og division – fra hovedregning til negative tal. Alle tal er mellem −99 og 99.',
    available: true,
  },
  { id: 'broek', title: 'Brøker', description: 'De fire regnearter med brøker.', available: true },
  {
    id: 'procent',
    title: 'Decimaltal og procent',
    description: 'Regn med decimaltal, og find procent af et tal.',
    available: true,
  },
  {
    id: 'ligninger',
    title: 'Ligninger',
    description: 'Løs ligningen trin for trin – gør det samme på begge sider af lighedstegnet.',
    available: true,
  },
  { id: 'algebra', title: 'Algebra', description: 'Reducer udtryk med x – fra at samle led til kvadratsætninger.', available: true },
]

export interface LevelInfo {
  /** Bruges i bane-id'er og adresser, fx "3" (bane "3-07") eller "P2" (bane "P2-07"). */
  code: string
  topic: TopicId
  /** Nummeret inden for emnet, som eleven ser det. */
  number: number
  title: string
  description: string
  example: string
  available: boolean
  reduce: ReduceRule
  /** Hvordan tallene skrives: brøk, blandet tal, decimaltal, algebraiske udtryk – eller en ligningstrappe. */
  form: 'frac' | 'mixed' | 'dec' | 'expr' | 'ladder'
  feedback: FeedbackMode
  /** Kan alle baner løses skridt for skridt (én ligning med ét ukendt tal ad gangen)? */
  stepwise: boolean
}

export const LEVELS: LevelInfo[] = [
  {
    code: 'H1',
    topic: 'hele',
    number: 1,
    title: 'Plus og minus',
    description: 'Læg sammen og træk fra med tal op til 99.',
    example: '47 + 38',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'H2',
    topic: 'hele',
    number: 2,
    title: 'Gange og division',
    description: 'Den lille tabel – og division, der går op.',
    example: '7 · 8',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'H3',
    topic: 'hele',
    number: 3,
    title: 'Alle fire regnearter',
    description: 'Plus, minus, gange og division på større baner.',
    example: '84 : 4',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'H4',
    topic: 'hele',
    number: 4,
    title: 'Negative tal',
    description: 'Alle fire regnearter med negative tal – hold styr på fortegnet.',
    example: '−6 − 9',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'equations',
    stepwise: true,
  },
  {
    code: 'H5',
    topic: 'hele',
    number: 5,
    title: 'Store baner',
    description: 'Store baner med flere tomme felter – brug brikkerne til at regne baglæns.',
    example: '? · ? = −24',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'equations',
    stepwise: false,
  },
  {
    code: '1',
    topic: 'broek',
    number: 1,
    title: 'Samme nævner',
    description: 'Plus og minus med brøker, der har samme nævner.',
    example: '2/7 + 3/7',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: '2',
    topic: 'broek',
    number: 2,
    title: 'Forskellige nævnere',
    description: 'Plus og minus – find fællesnævneren.',
    example: '1/2 + 1/3',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: '3',
    topic: 'broek',
    number: 3,
    title: 'Gange og dividere',
    description: 'Gange og division med brøker og hele tal.',
    example: '3 · 2/5',
    available: true,
    reduce: 'nudge',
    form: 'frac',
    feedback: 'equations',
    stepwise: true,
  },
  {
    code: '4',
    topic: 'broek',
    number: 4,
    title: 'Blandede tal',
    description: 'Plus og minus med blandede tal. Svarene skal være forkortede.',
    example: '3 1/4 − 1 3/4',
    available: true,
    reduce: 'required',
    form: 'mixed',
    feedback: 'equations',
    stepwise: true,
  },
  {
    code: '5',
    topic: 'broek',
    number: 5,
    title: 'Negative brøker',
    description: 'Alle fire regnearter – hold styr på fortegnet.',
    example: '−3/4 · 2/3',
    available: true,
    reduce: 'required',
    form: 'frac',
    feedback: 'equations',
    stepwise: false,
  },
  {
    code: 'P1',
    topic: 'procent',
    number: 1,
    title: 'Decimaltal: plus og minus',
    description: 'Husk at stille op med komma under komma.',
    example: '0,7 + 0,25',
    available: true,
    reduce: 'required',
    form: 'dec',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'P2',
    topic: 'procent',
    number: 2,
    title: 'Decimaltal: gange og dividere',
    description: 'Hvor skal kommaet stå?',
    example: '0,5 · 0,4',
    available: true,
    reduce: 'required',
    form: 'dec',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'P3',
    topic: 'procent',
    number: 3,
    title: 'Procent af et tal',
    description: 'Find delen, procenten eller det hele.',
    example: '25 % af 80',
    available: true,
    reduce: 'required',
    form: 'dec',
    feedback: 'equations',
    stepwise: true,
  },
  {
    code: 'L1',
    topic: 'ligninger',
    number: 1,
    title: 'Ét trin: plus og minus',
    description: 'Fjern tallet, der står sammen med x.',
    example: 'x + 7 = 12',
    available: true,
    reduce: 'required',
    form: 'ladder',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'L2',
    topic: 'ligninger',
    number: 2,
    title: 'Ét trin: gange og division',
    description: 'Fjern tallet, x er ganget eller divideret med.',
    example: '3x = 21',
    available: true,
    reduce: 'required',
    form: 'ladder',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'L3',
    topic: 'ligninger',
    number: 3,
    title: 'To trin',
    description: 'Først tallet, så det x er ganget med.',
    example: '3x + 5 = 20',
    available: true,
    reduce: 'required',
    form: 'ladder',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'L4',
    topic: 'ligninger',
    number: 4,
    title: 'x på begge sider',
    description: 'Saml x’erne på den ene side først.',
    example: '5x + 3 = 2x + 12',
    available: true,
    reduce: 'required',
    form: 'ladder',
    feedback: 'equations',
    stepwise: true,
  },
  {
    code: 'L5',
    topic: 'ligninger',
    number: 5,
    title: 'Parenteser og brøker',
    description: 'Gør det modsatte af parentesen eller brøkstregen.',
    example: '2(x + 3) = 14',
    available: true,
    reduce: 'required',
    form: 'ladder',
    feedback: 'equations',
    stepwise: true,
  },
  {
    code: 'A1',
    topic: 'algebra',
    number: 1,
    title: 'Saml led',
    description: 'Læg ensartede led sammen og træk dem fra hinanden.',
    example: '2x + 3x',
    available: true,
    reduce: 'required',
    form: 'expr',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'A2',
    topic: 'algebra',
    number: 2,
    title: 'Gange og dividere led',
    description: 'Gang og divider led med x og x².',
    example: '2x · 3x',
    available: true,
    reduce: 'required',
    form: 'expr',
    feedback: 'explain',
    stepwise: true,
  },
  {
    code: 'A3',
    topic: 'algebra',
    number: 3,
    title: 'Parenteser',
    description: 'Gang ind i en parentes, minusparenteser – og sæt uden for parentes.',
    example: '3 · (x + 2)',
    available: true,
    reduce: 'required',
    form: 'expr',
    feedback: 'equations',
    stepwise: true,
  },
  {
    code: 'A4',
    topic: 'algebra',
    number: 4,
    title: 'Kvadratsætninger',
    description: 'Gang to parenteser sammen – brug kvadratsætningerne.',
    example: '(x + 3) · (x + 3)',
    available: true,
    reduce: 'required',
    form: 'expr',
    feedback: 'equations',
    stepwise: true,
  },
]

export function levelInfo(code: string): LevelInfo {
  const info = LEVELS.find((l) => l.code === code)
  if (!info) throw new Error(`Ukendt niveau: ${code}`)
  return info
}

export function levelsForTopic(topic: TopicId): LevelInfo[] {
  return LEVELS.filter((l) => l.topic === topic)
}

export function topicInfo(id: TopicId): Topic {
  return TOPICS.find((t) => t.id === id)!
}

/** Den særlige regel for banen, som vises over brættet (tom tekst, hvis der ikke er nogen). */
export function ruleText(level: LevelInfo, puzzle: Puzzle | LadderPuzzle): string {
  if (level.form === 'ladder' || puzzle.kind === 'ladder') return 'Løs ligningen trin for trin. Gør det samme på begge sider.'
  if (level.form === 'expr') return 'Udtrykkene på hver side af = skal være ens – for alle værdier af x.'
  if (level.form === 'dec') {
    const hasPercent = puzzle.equations.some((e) => e.op === 'af')
    return hasPercent ? 'Procenter skrives med %, alle andre tal som decimaltal.' : ''
  }
  if (level.reduce === 'required') {
    return level.form === 'mixed' ? 'Svar skal være forkortede og skrevet som blandede tal.' : 'Svar skal være forkortede.'
  }
  return ''
}
