import type { Difficulty, KnownRecipe, Profession, ProfessionData, StaticRecipe } from './types'

export type { Difficulty }

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

export function difficultyColor(r: StaticRecipe, skill: number): Difficulty {
  if (skill < r.skillRange.yellow) return 'orange'
  if (skill < r.skillRange.green) return 'yellow'
  if (skill < r.skillRange.gray) return 'green'
  return 'gray'
}

const byLearnAtThenName = (a: StaticRecipe, b: StaticRecipe): number =>
  a.learnAt - b.learnAt || a.name.localeCompare(b.name)

export function classifyRecipes(p: Profession, data: ProfessionData): ClassifiedRecipes {
  const known = p.knownRecipes ?? []
  const knownNames = new Set(known.map((r) => r.name))
  const knownSpells = new Set(known.flatMap((r) => (r.spellId === undefined ? [] : [r.spellId])))
  const isKnown = (r: StaticRecipe): boolean =>
    (r.spellId !== undefined && knownSpells.has(r.spellId)) || knownNames.has(r.name)
  const staticNames = new Set(data.recipes.map((r) => r.name))
  const staticSpells = new Set(data.recipes.flatMap((r) => (r.spellId === undefined ? [] : [r.spellId])))
  const view = (recipe: StaticRecipe): RecipeView => ({ recipe, difficulty: difficultyColor(recipe, p.skill) })
  const sorted = [...data.recipes].sort(byLearnAtThenName)

  const notKnown = sorted.filter((r) => !isKnown(r))
  const nextLearnAt = Math.min(...notKnown.filter((r) => r.learnAt > p.skill).map((r) => r.learnAt))

  return {
    scanned: p.knownRecipes !== undefined,
    known: sorted.filter(isKnown).map(view),
    availableNow: notKnown.filter((r) => r.learnAt <= p.skill).map(view),
    availableNext: notKnown.filter((r) => r.learnAt === nextLearnAt).map(view),
    unknownKnown: known.filter(
      (r) => !staticNames.has(r.name) && (r.spellId === undefined || !staticSpells.has(r.spellId))
    )
  }
}
