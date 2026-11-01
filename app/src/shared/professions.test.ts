import { describe, it, expect } from 'vitest'
import { classifyRecipes, difficultyColor } from './professions'
import { alchemy, fixtureSnapshot } from '../../test/snapshot'
import type { Profession } from './types'

const thrallAlchemy = (): Profession =>
  fixtureSnapshot().characters.find((c) => c.name === 'Thrall')!.professions.find((p) => p.name === 'Alchemy')!

const names = (xs: { recipe: { name: string } }[]) => xs.map((x) => x.recipe.name)

describe('difficultyColor', () => {
  const mhp = alchemy.recipes.find((r) => r.name === 'Minor Healing Potion')!
  it.each([
    [30, 'orange'],
    [54, 'orange'],
    [55, 'yellow'],
    [80, 'green'],
    [95, 'gray']
  ])('skill %i → %s', (skill, color) => {
    expect(difficultyColor(mhp, skill)).toBe(color)
  })
})

describe('classifyRecipes', () => {
  it('splits known, now and next for Thrall (142)', () => {
    const c = classifyRecipes(thrallAlchemy(), alchemy)
    expect(c.scanned).toBe(true)
    expect(names(c.known)).toEqual(['Minor Healing Potion'])
    expect(c.known[0].difficulty).toBe('gray')
    expect(names(c.availableNow)).toEqual(["Elixir of Lion's Strength", 'Lesser Healing Potion', 'Swiftness Potion'])
    expect(names(c.availableNext)).toEqual(['Elixir of Wisdom', 'Healing Potion'])
    expect(c.availableNext[0].difficulty).toBe('orange')
    expect(c.unknownKnown).toEqual([])
  })

  it('known recipe missing from static data → unknownKnown', () => {
    const p = thrallAlchemy()
    p.knownRecipes!.push({ name: 'Mystery Brew', reagents: [{ itemId: 99999, count: 2 }] })
    const c = classifyRecipes(p, alchemy)
    expect(c.unknownKnown.map((r) => r.name)).toEqual(['Mystery Brew'])
  })

  it('unscanned profession → scanned false, nothing known', () => {
    const p: Profession = { name: 'Alchemy', skill: 50, maxSkill: 75 }
    const c = classifyRecipes(p, alchemy)
    expect(c.scanned).toBe(false)
    expect(c.known).toEqual([])
    expect(c.unknownKnown).toEqual([])
    expect(names(c.availableNow)).toEqual(["Elixir of Lion's Strength", 'Minor Healing Potion'])
    expect(names(c.availableNext)).toEqual(['Lesser Healing Potion'])
  })

  it('matches a known recipe by spellId even if names differ', () => {
    const p: Profession = { name: 'Alchemy', skill: 142, maxSkill: 150, knownRecipes: [{ name: 'Minor Healing Draught', spellId: 2330, reagents: [] }] }
    const c = classifyRecipes(p, alchemy)
    expect(names(c.known)).toEqual(['Minor Healing Potion'])
    expect(c.unknownKnown).toEqual([])
  })

  it('matches by name when the static recipe has no spellId', () => {
    const data = { ...alchemy, recipes: alchemy.recipes.map((r) => ({ ...r, spellId: undefined })) }
    const p: Profession = { name: 'Alchemy', skill: 142, maxSkill: 150, knownRecipes: [{ name: 'Minor Healing Potion', spellId: 2330, reagents: [] }] }
    expect(names(classifyRecipes(p, data).known)).toEqual(['Minor Healing Potion'])
  })

  it('nothing left to learn → availableNext empty', () => {
    const p: Profession = { name: 'Alchemy', skill: 300, maxSkill: 300, knownRecipes: [] }
    expect(classifyRecipes(p, alchemy).availableNext).toEqual([])
  })
})
