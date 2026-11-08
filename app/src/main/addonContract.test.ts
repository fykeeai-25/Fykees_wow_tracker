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

  it('writes client diagnostics: build, interface, missing APIs, Legacy APIs', () => {
    const d = run().diagnostics!
    expect(d).toMatchObject({ build: '1.60.1', buildNumber: '70058', interface: 11600, addonVersion: '0.1.0', checkedAt: 1761980000 })
    // alternatives count as available (legacy container API, GetCraftItemLink for recipe links)
    expect(d.missing).toEqual([])
    expect(d.legacyApis).toEqual(['C_LegacyTree'])
  })

  it('reports a missing API in diagnostics', () => {
    expect(run('no-currency-api').diagnostics!.missing).toEqual(['C_CurrencyInfo.GetCurrencyListSize', 'C_CurrencyInfo.GetCurrencyListInfo'])
  })

  it('writes no currencies when the client has no currency API', () => {
    const c = run('no-currency-api').characters[0]
    expect(c.money).toBe(123456)
    expect(c.currencies).toBeUndefined()
  })

  it('probes the profession API of clients without the Classic trade skill functions', () => {
    const out = execFileSync(
      lua!,
      [join(repo, 'addon/test/harness.lua'), join(repo, 'addon/AzerothTracker/AzerothTracker.lua'), 'modern-trade-api'],
      { encoding: 'utf8' }
    )
    const db = parseSavedVariables(out) as any
    const probe = db.probe
    expect(probe.globals).toContain('GetProfessions')
    expect(probe.globals).toContain('C_TradeSkillUI')
    expect(probe.namespaces.C_TradeSkillUI).toContain('GetAllRecipeIDs')
    expect(probe.namespaces.C_TradeSkillUI).toContain('Broken')
    expect(probe.events.TRADE_SKILL_SHOW).toBe(1)
    expect(probe.events.TRADE_SKILL_LIST_UPDATE).toBe(1)
    const calls = probe.calls.TRADE_SKILL_LIST_UPDATE
    expect(calls['GetProfessions()']).toEqual([1, 'nil', 'nil', 'nil', 3])
    expect(calls['GetProfessionInfo(1)'][0]).toBe('Alchemy')
    expect(calls['C_TradeSkillUI.GetAllRecipeIDs()']).toEqual([[2330, 2329, 2337]])
    expect(calls['C_TradeSkillUI.GetRecipeInfo(2330)'][0]).toMatchObject({ recipeID: 2330, name: 'Minor Healing Potion', learned: true })
    expect(calls['C_TradeSkillUI.GetBaseProfessionInfo()'][0]).toMatchObject({ professionName: 'Alchemy' })
    // the app still reads the file; the probe does not break anything
    expect(normalize(db).characters[0].bags?.items).toEqual({ 2447: 4, 2449: 2 })
  })

  describe('modern profession API (WoW: Forever 1.60)', () => {
    it('reads professions and skill from GetProfessions', () => {
      const c = run('modern-trade-api').characters[0]
      expect(c.professions.map((p) => `${p.name} ${p.skill}/${p.maxSkill}`)).toEqual(['Alchemy 142/150', 'Cooking 50/75'])
    })

    it('reads learned recipes with required reagents, created item and difficulty', () => {
      const s = run('modern-trade-api')
      const alch = s.characters[0].professions.find((p) => p.name === 'Alchemy')!
      expect(alch.scannedAt).toBe(1761980000)
      expect(alch.knownRecipes!.map((r) => r.name)).toEqual(["Elixir of Lion's Strength", 'Minor Healing Potion'])
      const mhp = alch.knownRecipes!.find((r) => r.name === 'Minor Healing Potion')!
      expect(mhp).toMatchObject({ spellId: 2330, createdItemId: 118, numMade: 1, difficulty: 'gray' })
      // optional (non-basic) reagent slots are not part of the recipe cost
      expect(mhp.reagents).toEqual([
        { itemId: 2447, count: 1 },
        { itemId: 2449, count: 1 }
      ])
      expect(alch.knownRecipes!.find((r) => r.name === "Elixir of Lion's Strength")!.difficulty).toBe('green')
      expect(s.itemNames).toMatchObject({ 118: 'Minor Healing Potion', 765: 'Silverleaf', 2447: 'Peacebloom' })
    })

    it("never stores recipes from someone else's linked profession window", () => {
      const alch = run('modern-linked').characters[0].professions.find((p) => p.name === 'Alchemy')!
      expect(alch.knownRecipes ?? []).toEqual([])
    })
  })

  describe('dungeon runs', () => {
    it('records a run with bosses killed, deaths, XP across a level-up, gold and loot', () => {
      const s = run('dungeon-run')
      expect(s.characters[0].runs).toEqual([
        {
          dungeon: 'The Deadmines',
          difficulty: 'Normal',
          startedAt: 1761980100,
          endedAt: 1761981420,
          level: 24,
          xp: 1400,
          money: 2500,
          deaths: 1,
          bosses: ["Rhahk'Zor", 'Edwin VanCleef'],
          loot: [
            { itemId: 2447, count: 2 },
            { itemId: 5200, count: 1 }
          ],
          completed: true
        }
      ])
      expect(s.itemNames[5200]).toBe("Thief's Blade")
    })

    it('leaving briefly and coming back to the same dungeon keeps one run', () => {
      const runs = run('dungeon-port-back').characters[0].runs!
      expect(runs).toHaveLength(1)
      expect(runs[0]).toMatchObject({ dungeon: 'The Deadmines', xp: 300, startedAt: 1761980000, endedAt: 1761981500 })
    })

    it('coming back much later starts a new run', () => {
      const runs = run('dungeon-twice').characters[0].runs!
      expect(runs.map((r) => r.xp)).toEqual([100, 200])
    })

    it('a run still open at logout is listed as in progress', () => {
      const runs = run('dungeon-logout').characters[0].runs!
      expect(runs).toHaveLength(1)
      expect(runs[0]).toMatchObject({ dungeon: 'Wailing Caverns', inProgress: true, startedAt: 1761980000, bosses: [] })
    })

    it('resetting and running the same dungeon again right away gives two runs', () => {
      const runs = run('dungeon-farm').characters[0].runs!
      expect(runs.map((r) => ({ bosses: r.bosses, xp: r.xp, deaths: r.deaths, money: r.money, startedAt: r.startedAt, endedAt: r.endedAt }))).toEqual([
        { bosses: ["Rhahk'Zor", 'Edwin VanCleef'], xp: 600, deaths: 0, money: 0, startedAt: 1761980000, endedAt: 1761980600 },
        { bosses: ["Rhahk'Zor"], xp: 300, deaths: 1, money: 700, startedAt: 1761980720, endedAt: 1761981320 }
      ])
    })

    it('no runs without entering an instance', () => {
      expect(run().characters[0].runs ?? []).toEqual([])
    })
  })

  it('collapsing a recipe category keeps the hidden recipes', () => {
    const alch = run('collapsed-recipes').characters[0].professions.find((p) => p.name === 'Alchemy')!
    expect(alch.knownRecipes!.map((r) => r.name)).toEqual(["Elixir of Lion's Strength", 'Minor Healing Potion'])
  })
})
