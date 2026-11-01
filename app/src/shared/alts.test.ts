import { describe, it, expect } from 'vitest'
import { currencyColumns, searchItems, totals } from './alts'
import { fixtureSnapshot, sampleItems, FIXTURE_NOW } from '../../test/snapshot'

describe('searchItems', () => {
  it('finds owned items by part of the name with all sources', () => {
    const hits = searchItems('bloom', fixtureSnapshot(), sampleItems, FIXTURE_NOW)
    expect(hits.map((h) => [h.name, h.total])).toEqual([['Peacebloom', 32]])
    expect(hits[0].sources.map((s) => s.container)).toEqual(['bags', 'bank', 'accountBank'])
  })

  it('ignores letter case', () => {
    expect(searchItems('BLOOM', fixtureSnapshot(), sampleItems, FIXTURE_NOW)).toHaveLength(1)
  })

  it('needs at least 2 characters', () => {
    expect(searchItems('b', fixtureSnapshot(), sampleItems, FIXTURE_NOW)).toEqual([])
    expect(searchItems('  ', fixtureSnapshot(), sampleItems, FIXTURE_NOW)).toEqual([])
  })

  it('finds items known only from the addon', () => {
    const s = fixtureSnapshot()
    s.itemNames[5555] = 'Addon Thing'
    s.characters[0].bags!.items[5555] = 2
    expect(searchItems('addon', s, sampleItems, FIXTURE_NOW).map((h) => h.name)).toEqual(['Addon Thing'])
  })

  it('skips items nobody owns', () => {
    expect(searchItems('bruise', fixtureSnapshot(), sampleItems, FIXTURE_NOW)).toEqual([])
  })

  it('treats special characters literally', () => {
    expect(() => searchItems('[(', fixtureSnapshot(), sampleItems, FIXTURE_NOW)).not.toThrow()
    expect(searchItems('[(', fixtureSnapshot(), sampleItems, FIXTURE_NOW)).toEqual([])
  })

  it('sorts by name and respects the limit', () => {
    const hits = searchItems('ro', fixtureSnapshot(), sampleItems, FIXTURE_NOW)
    expect(hits.map((h) => h.name)).toEqual(['Earthroot'])
    expect(searchItems('e', fixtureSnapshot(), sampleItems, FIXTURE_NOW, 1)).toEqual([])
    expect(searchItems('oo', fixtureSnapshot(), sampleItems, FIXTURE_NOW, 1).map((h) => h.name)).toEqual(['Earthroot'])
  })
})

describe('alts totals', () => {
  it('lists currencies that any character has', () => {
    expect(currencyColumns(fixtureSnapshot())).toEqual(["Merchant's Favor"])
  })

  it('sums gold and currencies, skipping missing values', () => {
    const s = fixtureSnapshot()
    s.characters.push({ ...s.characters[0], key: 'R-NoMoney', name: 'NoMoney', money: undefined, currencies: undefined })
    expect(totals(s)).toEqual({ money: 128456, currencies: { "Merchant's Favor": 7 } })
  })
})
