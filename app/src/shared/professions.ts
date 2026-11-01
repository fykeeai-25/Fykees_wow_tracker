import type { KnownRecipe, Profession, ProfessionData, StaticRecipe } from './types'

export type Difficulty = 'orange' | 'yellow' | 'green' | 'gray'

export interface RecipeView {
  recipe: StaticRecipe
  difficulty: Difficulty
}

export interface ClassifiedRecipes {
  scanned: boolean
  known: RecipeView[]
  availableNow: RecipeView[]
  availableNext: RecipeView[]
  unknownKnown: KnownRecipe[]
}

export function difficultyColor(_r: StaticRecipe, _skill: number): Difficulty {
  throw new Error('not implemented')
}

export function classifyRecipes(_p: Profession, _data: ProfessionData): ClassifiedRecipes {
  throw new Error('not implemented')
}
