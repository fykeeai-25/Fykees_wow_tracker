import { describe, it, expect } from 'vitest'
import { itemName, materialAvailability, STALE_AFTER_SECONDS, unscannedBanks } from './materials'
import { alchemy, fixtureSnapshot, FIXTURE_NOW } from '../../test/snapshot'

const mhp = alchemy.recipes.find((r) => r.name === 'Minor Healing Potion')!

describe('materialAvailability', () => {
  it('sums bags, bank and account bank across characters', () => {
    const rows = materialAvailability(mhp.reagents, fixtureSnapshot(), alchemy, FIXTURE_NOW)
    const peace = rows.find((r) => r.itemId === 2447)!
    expect(peace.name).toBe('Peacebloom')
    expect(peace.needed).toBe(1)
    expect(peace.total).toBe(32)
    expect(peace.enough).toBe(true)
    expect(peace.sources).toEqual([
      { container: 'bags', characterKey: 'Firemaw-Thrall', characterName: 'Thrall', count: 4, seenAt: FIXTURE_NOW, stale: false },
      { container: 'bank', characterKey: 'Firemaw-Thrall', characterName: 'Thrall', count: 8, seenAt: FIXTURE_NOW - 345600, stale: true },
      { container: 'accountBank', count: 20, seenAt: FIXTURE_NOW, stale: false }
    ])
    const earth = rows.find((r) => r.itemId === 2449)!
    expect(earth.total).toBe(3)
    expect(earth.sources.map((s) => s.characterName)).toEqual(['Jaina'])
  })

  it('multiplier scales needed and enough', () => {
    const rows = materialAvailability(mhp.reagents, fixtureSnapshot(), alchemy, FIXTURE_NOW, 5)
    const earth = rows.find((r) => r.itemId === 2449)!
    expect(earth.needed).toBe(5)
    expect(earth.enough).toBe(false)
  })

  it('item nobody has → total 0, no sources', () => {
    const rows = materialAvailability([{ itemId: 2453, count: 2 }], fixtureSnapshot(), alchemy, FIXTURE_NOW)
    expect(rows).toEqual([{ itemId: 2453, name: 'Bruiseweed', needed: 2, total: 0, enough: false, sources: [] }])
  })

  it('stale threshold is 3 days', () => {
    expect(STALE_AFTER_SECONDS).toBe(259200)
  })
})

describe('itemName', () => {
  it('prefers static data, then addon names, then fallback', () => {
    const s = fixtureSnapshot()
    s.itemNames[5555] = 'Addon Thing'
    expect(itemName(765, s, alchemy)).toBe('Silverleaf')
    expect(itemName(5555, s, alchemy)).toBe('Addon Thing')
    expect(itemName(2447, s)).toBe('Peacebloom')
    expect(itemName(99999, s, alchemy)).toBe('Item #99999')
  })
})

describe('unscannedBanks', () => {
  it('lists characters whose bank was never seen', () => {
    expect(unscannedBanks(fixtureSnapshot())).toEqual([{ characterKey: 'Firemaw-Jaina', characterName: 'Jaina' }])
  })
})
