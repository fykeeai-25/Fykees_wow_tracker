export type ItemCounts = Record<number, number>

export interface Container {
  seenAt: number
  items: ItemCounts
}

export interface Reagent {
  itemId: number
  count: number
}

export type Difficulty = 'orange' | 'yellow' | 'green' | 'gray'

export interface KnownRecipe {
  name: string
  spellId?: number
  createdItemId?: number
  numMade?: number
  /** colour the game showed at scan time */
  difficulty?: Difficulty
  reagents: Reagent[]
}

export interface Profession {
  name: string
  skill: number
  maxSkill: number
  scannedAt?: number
  /** undefined = profession window never scanned (or gathering profession) */
  knownRecipes?: KnownRecipe[]
}

export interface Character {
  key: string
  name: string
  realm: string
  race: string
  className: string
  level: number
  updatedAt: number
  professions: Profession[]
  bags?: Container
  bank?: Container
}

export interface TrackerSnapshot {
  schemaVersion: number
  characters: Character[]
  accountBank?: Container
  itemNames: Record<number, string>
}

export interface StaticRecipe {
  name: string
  spellId?: number
  createdItemId?: number
  learnAt: number
  skillRange: { yellow: number; green: number; gray: number }
  source: { type: 'trainer' | 'vendor' | 'drop' | 'quest' | 'unknown'; cost?: number }
  reagents: Reagent[]
}

export interface ProfessionData {
  profession: string
  items: Record<string, string>
  recipes: StaticRecipe[]
}

export type LoadState =
  | { status: 'ok'; snapshot: TrackerSnapshot; fileUpdatedAt: number; warning?: string }
  | { status: 'missing' }
  | { status: 'error'; message: string }

export type AppState =
  | { phase: 'needs-game-dir'; reason?: 'missing-dir' | 'missing-wtf' | 'no-accounts' }
  | { phase: 'needs-account'; gameDir: string; accounts: string[] }
  | { phase: 'ready'; gameDir: string; account: string; load: LoadState }
