/**
 * Niveauerne og deres regler – samlet ét sted, så gameplay kan justeres her.
 */

/**
 * Hvad sker der, hvis eleven lægger en uforkortet (eller ikke-blandet) brik
 * med den rigtige værdi?
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

export interface LevelInfo {
  level: number
  title: string
  description: string
  example: string
  available: boolean
  reduce: ReduceRule
  /** Skal tal over 1 skrives som blandede tal? */
  mixed: boolean
  feedback: FeedbackMode
}

export const LEVELS: LevelInfo[] = [
  {
    level: 1,
    title: 'Samme nævner',
    description: 'Plus og minus med brøker, der har samme nævner.',
    example: '2/7 + 3/7',
    available: true,
    reduce: 'nudge',
    mixed: false,
    feedback: 'explain',
  },
  {
    level: 2,
    title: 'Forskellige nævnere',
    description: 'Plus og minus – find fællesnævneren.',
    example: '1/2 + 1/3',
    available: true,
    reduce: 'nudge',
    mixed: false,
    feedback: 'explain',
  },
  {
    level: 3,
    title: 'Gange og dividere',
    description: 'Gange og division med brøker og hele tal.',
    example: '3 · 2/5',
    available: true,
    reduce: 'nudge',
    mixed: false,
    feedback: 'equations',
  },
  {
    level: 4,
    title: 'Blandede tal',
    description: 'Plus og minus med blandede tal. Svarene skal være forkortede.',
    example: '3 1/4 − 1 3/4',
    available: true,
    reduce: 'required',
    mixed: true,
    feedback: 'equations',
  },
  {
    level: 5,
    title: 'Negative brøker',
    description: 'Alle fire regnearter – hold styr på fortegnet.',
    example: '−3/4 · 2/3',
    available: true,
    reduce: 'required',
    mixed: false,
    feedback: 'equations',
  },
  {
    level: 6,
    title: 'Brøk, decimal og procent',
    description: 'Det samme tal skrevet på forskellige måder.',
    example: '1/4 + 0,5',
    available: false,
    reduce: 'required',
    mixed: false,
    feedback: 'count',
  },
  {
    level: 7,
    title: 'Regnehierarki',
    description: 'Længere regnestykker og potenser. Der kan være flere løsninger.',
    example: '1/2 + 1/3 · 3/4',
    available: false,
    reduce: 'required',
    mixed: false,
    feedback: 'count',
  },
]

export function levelInfo(level: number): LevelInfo {
  const info = LEVELS.find((l) => l.level === level)
  if (!info) throw new Error(`Ukendt niveau: ${level}`)
  return info
}
