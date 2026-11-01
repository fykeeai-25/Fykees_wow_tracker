import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'child_process'
import { join } from 'path'
import { parseSavedVariables } from './luaParser'
import { normalize } from './normalizer'

const repo = join(__dirname, '../../..')
const lua = ['lua5.1', 'lua'].find((bin) => spawnSync(bin, ['-v']).status === 0)

// Runs the real addon against a mocked WoW API (addon/test/harness.lua) and checks
// that the app can read what it writes. CI installs lua5.1; skipped locally without Lua.
describe.skipIf(!lua)('addon → app contract', () => {
  const run = (scenario = 'default') =>
    normalize(
      parseSavedVariables(
        execFileSync(
          lua!,
          [join(repo, 'addon/test/harness.lua'), join(repo, 'addon/AzerothTracker/AzerothTracker.lua'), scenario],
          { encoding: 'utf8' }
        )
      )
    )

  it('writes the character with basics', () => {
    const s = run()
    expect(s.characters).toHaveLength(1)
    const c = s.characters[0]
    expect(c).toMatchObject({ key: 'Firemaw-Thrall', name: 'Thrall', realm: 'Firemaw', className: 'SHAMAN', level: 24 })
  })

  it('writes primary and secondary professions, not weapon skills', () => {
    const c = run().characters[0]
    expect(c.professions.map((p) => `${p.name} ${p.skill}/${p.maxSkill}`)).toEqual([
      'Alchemy 142/150',
      'Cooking 50/75',
      'Herbalism 160/225'
    ])
  })

  it('writes scanned recipes with reagents, skipping headers', () => {
    const alch = run().characters[0].professions.find((p) => p.name === 'Alchemy')!
    expect(alch.scannedAt).toBe(1761980000)
    expect(alch.knownRecipes!.map((r) => r.name)).toEqual(["Elixir of Lion's Strength", 'Minor Healing Potion'])
    expect(alch.knownRecipes!.find((r) => r.name === 'Minor Healing Potion')!.reagents).toEqual([
      { itemId: 2447, count: 1 },
      { itemId: 2449, count: 1 }
    ])
  })

  it('writes bags, bank and item names', () => {
    const s = run()
    expect(s.characters[0].bags).toEqual({ seenAt: 1761980000, items: { 2447: 4, 2449: 2 } })
    expect(s.characters[0].bank).toEqual({ seenAt: 1761980000, items: { 2447: 8 } })
    expect(s.itemNames).toMatchObject({ 765: 'Silverleaf', 2447: 'Peacebloom', 2449: 'Earthroot' })
    expect(s.accountBank).toBeUndefined()
  })

  it('collapsing one skill header keeps the hidden professions and their recipes', () => {
    const c = run('collapsed-professions').characters[0]
    const alch = c.professions.find((p) => p.name === 'Alchemy')
    expect(alch?.knownRecipes).toHaveLength(2)
    expect(c.professions.find((p) => p.name === 'Herbalism')?.skill).toBe(160)
    expect(c.professions.find((p) => p.name === 'Cooking')?.skill).toBe(51)
  })

  it('records professions even when the header text differs from TRADE_SKILLS', () => {
    const c = run('global-mismatch').characters[0]
    expect(c.professions.map((p) => p.name)).toEqual(['Alchemy', 'Cooking', 'Herbalism'])
  })

  it('writes schema 3 with spell id, created item, numMade and game difficulty', () => {
    const s = run()
    expect(s.schemaVersion).toBe(3)
    const alch = s.characters[0].professions.find((p) => p.name === 'Alchemy')!
    const mhp = alch.knownRecipes!.find((r) => r.name === 'Minor Healing Potion')!
    expect(mhp).toMatchObject({ spellId: 2330, createdItemId: 118, numMade: 1, difficulty: 'gray' })
    const lion = alch.knownRecipes!.find((r) => r.name === "Elixir of Lion's Strength")!
    expect(lion.difficulty).toBe('green')
  })

  it('an uncached reagent never overwrites a complete recipe', () => {
    const alch = run('uncached-reagent').characters[0].professions.find((p) => p.name === 'Alchemy')!
    const mhp = alch.knownRecipes!.find((r) => r.name === 'Minor Healing Potion')!
    expect(mhp.reagents).toHaveLength(2)
  })

  it('a recipe skipped for an uncached reagent is stored once the item info arrives', () => {
    const alch = run('cache-arrives').characters[0].professions.find((p) => p.name === 'Alchemy')!
    const mhp = alch.knownRecipes!.find((r) => r.name === 'Minor Healing Potion')
    expect(mhp?.reagents).toHaveLength(2)
  })

  it('writes money and currencies', () => {
    const c = run().characters[0]
    expect(c).toMatchObject({ money: 123456, moneyAt: 1761980000, currencies: { "Merchant's Favor": 7 } })
  })

  it('a collapsed currency header keeps the hidden currencies', () => {
    expect(run('collapsed-currency').characters[0].currencies).toEqual({ "Merchant's Favor": 7 })
  })

  it('an empty currency list never wipes saved currencies', () => {
    expect(run('empty-currency-list').characters[0].currencies).toEqual({ "Merchant's Favor": 7 })
  })

  it('writes no currencies when the client has no currency API', () => {
    const c = run('no-currency-api').characters[0]
    expect(c.money).toBe(123456)
    expect(c.currencies).toBeUndefined()
  })

  it('collapsing a recipe category keeps the hidden recipes', () => {
    const alch = run('collapsed-recipes').characters[0].professions.find((p) => p.name === 'Alchemy')!
    expect(alch.knownRecipes!.map((r) => r.name)).toEqual(["Elixir of Lion's Strength", 'Minor Healing Potion'])
  })
})
