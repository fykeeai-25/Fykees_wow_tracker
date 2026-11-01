import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { validateData, buildPack } from './data-pack.mjs'

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../data')

const recipe = (over = {}) => ({
  name: 'Minor Healing Potion',
  spellId: 2330,
  createdItemId: 118,
  learnAt: 1,
  skillRange: { yellow: 55, green: 75, gray: 95 },
  source: { type: 'trainer', cost: 0 },
  reagents: [{ itemId: 2447, count: 1 }],
  ...over
})
const valid = () => ({
  items: { 118: 'Minor Healing Potion', 2447: 'Peacebloom' },
  professions: [{ profession: 'Alchemy', recipes: [recipe()] }]
})

describe('validateData', () => {
  it('accepts valid data', () => {
    expect(validateData(valid())).toEqual([])
  })

  it('reports reagent without item name', () => {
    const d = valid()
    delete d.items[2447]
    expect(validateData(d)).toEqual(['missing item name 2447 (in Minor Healing Potion)'])
  })

  it('reports created item without name', () => {
    const d = valid()
    delete d.items[118]
    expect(validateData(d)).toEqual(['missing item name 118 (in Minor Healing Potion)'])
  })

  it('reports duplicate spell ids across professions', () => {
    const d = valid()
    d.professions.push({ profession: 'First Aid', recipes: [recipe({ name: 'Copy' })] })
    expect(validateData(d)).toEqual(['duplicate spellId 2330'])
  })

  it('reports skill ranges out of order', () => {
    const d = valid()
    d.professions[0].recipes[0].skillRange = { yellow: 80, green: 75, gray: 95 }
    expect(validateData(d)).toEqual(['skill ranges out of order in Minor Healing Potion'])
  })

  it('reports learnAt above yellow', () => {
    const d = valid()
    d.professions[0].recipes[0].learnAt = 60
    expect(validateData(d)).toEqual(['skill ranges out of order in Minor Healing Potion'])
  })

  it('reports unknown source type', () => {
    const d = valid()
    d.professions[0].recipes[0].source = { type: 'bogus' }
    expect(validateData(d)).toEqual(['unknown source type "bogus" in Minor Healing Potion'])
  })
})

describe('buildPack', () => {
  it('builds the pack from the data folder', () => {
    const pack = buildPack(dataDir, 7, new Date('2026-11-01T12:00:00Z'))
    expect(pack.manifest).toEqual({ dataSchema: 1, dataVersion: 7, generatedAt: '2026-11-01T12:00:00.000Z' })
    expect(pack.items['2447']).toBe('Peacebloom')
    expect(pack.professions.map((p) => p.profession)).toContain('Alchemy')
    expect(pack.professions[0]).not.toHaveProperty('items')
  })
})
