/**
 * Emner, niveauer og deres regler – samlet ét sted, så gameplay kan justeres her.
 */

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

export type TopicId = 'broek' | 'procent' | 'algebra'

export interface Topic {
  id: TopicId
  title: string
  description: string
  available: boolean
}

export const TOPICS: Topic[] = [
  { id: 'broek', title: 'Brøker', description: 'De fire regnearter med brøker.', available: true },
  {
    id: 'procent',
    title: 'Decimaltal og procent',
    description: 'Regn med decimaltal, og find procent af et tal.',
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
  /** Hvordan tallene skrives: brøk, blandet tal, decimaltal eller algebraiske udtryk. */
  form: 'frac' | 'mixed' | 'dec' | 'expr'
  feedback: FeedbackMode
  /** Kan alle baner løses skridt for skridt (én ligning med ét ukendt tal ad gangen)? */
  stepwise: boolean
}

export const LEVELS: LevelInfo[] = [
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
