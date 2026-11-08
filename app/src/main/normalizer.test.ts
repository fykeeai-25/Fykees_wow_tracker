import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSavedVariables } from './luaParser'
import { normalize, AddonNewerError, rebaseTimes } from './normalizer'

const raw = () =>
  parseSavedVariables(readFileSync(join(__dirname, '../../test/fixtures/AzerothTracker.lua'), 'utf8'))

describe('normalize', () => {
  it('characters sorted by key', () => {
    const s = normalize(raw())
    expect(s.characters.map((c) => c.key)).toEqual(['Firemaw-Jaina', 'Firemaw-Thrall'])
    const thrall = s.characters[1]
    expect(thrall.className).toBe('SHAMAN')
    expect(thrall.level).toBe(24)
    expect(thrall.name).toBe('Thrall')
  })

  it('Herbalism has knownRecipes undefined, Alchemy has reagents', () => {
    const thrall = normalize(raw()).characters[1]
    const herb = thrall.professions.find((p) => p.name === 'Herbalism')!
    const alch = thrall.professions.find((p) => p.name === 'Alchemy')!
    expect(herb.knownRecipes).toBeUndefined()
    expect(herb.skill).toBe(160)
    expect(alch.maxSkill).toBe(150)
    expect(alch.scannedAt).toBe(1761980000)
    expect(alch.knownRecipes![0].name).toBe('Minor Healing Potion')
    expect(alch.knownRecipes![0].reagents).toEqual([
      { itemId: 2447, count: 1 },
      { itemId: 2449, count: 1 }
    ])
  })

  it('Jaina has no bank and no professions', () => {
    const jaina = normalize(raw()).characters[0]
    expect(jaina.bank).toBeUndefined()
    expect(jaina.professions).toEqual([])
    expect(jaina.bags).toEqual({ seenAt: 1761900000, items: { 2449: 3 } })
  })

  it('itemNames keys are numbers, accountBank kept', () => {
    const s = normalize(raw())
    expect(s.itemNames[2447]).toBe('Peacebloom')
    expect(s.accountBank).toEqual({ seenAt: 1761980000, items: { 2447: 20 } })
  })

  it('missing optional sections default', () => {
    const s = normalize({ schemaVersion: 3 })
    expect(s.characters).toEqual([])
    expect(s.itemNames).toEqual({})
    expect(s.accountBank).toBeUndefined()
  })

  it('drops wrongly typed fields instead of throwing', () => {
    const s = normalize({
      schemaVersion: 3,
      characters: { 'R-X': { name: 'X', level: 'high', professions: 'nope', bags: { items: { 5: 'two' } } } }
    })
    expect(s.characters[0].level).toBe(0)
    expect(s.characters[0].professions).toEqual([])
    expect(s.characters[0].bags).toBeUndefined()
  })

  it('reads v2 recipe fields', () => {
    const alch = normalize(raw()).characters[1].professions.find((p) => p.name === 'Alchemy')!
    expect(alch.knownRecipes![0]).toMatchObject({
      name: 'Minor Healing Potion',
      spellId: 2330,
      createdItemId: 118,
      numMade: 1,
      difficulty: 'gray'
    })
  })

  it('name falls back to the key and bad difficulty is dropped', () => {
    const s = normalize({
      schemaVersion: 3,
      characters: { 'R-X': { professions: { Alchemy: { skill: 1, maxSkill: 75, recipes: { 'Odd Brew': { difficulty: 'purple', reagents: [] } } } } } }
    })
    const r = s.characters[0].professions[0].knownRecipes![0]
    expect(r.name).toBe('Odd Brew')
    expect(r.difficulty).toBeUndefined()
  })

  it('newer addon schema → AddonNewerError', () => {
    expect(() => normalize({ schemaVersion: 4 })).toThrow(AddonNewerError)
    expect(() => normalize({ schemaVersion: 4 })).toThrow('The addon is newer than the app – please update AzerothTracker.')
  })

  it('reads money and currencies', () => {
    const [jaina, thrall] = normalize(raw()).characters
    expect(thrall).toMatchObject({ money: 123456, moneyAt: 1761980000, currencies: { "Merchant's Favor": 7 } })
    expect(jaina.money).toBe(5000)
    expect(jaina.currencies).toBeUndefined()
  })

  it('drops non-numeric money and currency counts', () => {
    const s = normalize({
      schemaVersion: 3,
      characters: { 'R-X': { money: 'lots', currencies: { Honor: { count: 'x' }, Favor: { count: 3 } } } }
    })
    expect(s.characters[0].money).toBeUndefined()
    expect(s.characters[0].currencies).toEqual({ Favor: 3 })
  })

  it('reads client diagnostics', () => {
    expect(normalize(raw()).diagnostics).toEqual({
      build: '1.60.1',
      buildNumber: '70058',
      interface: 11600,
      addonVersion: '0.1.0',
      checkedAt: 1761980000,
      missing: ['GetCraftRecipeLink'],
      legacyApis: []
    })
  })

  it('rejects old schemaVersion', () => {
    expect(() => normalize({ schemaVersion: 2 })).toThrow('The addon is older than the app – install the addon that came with this version and /reload.')
  })

  it('rebaseTimes shifts every timestamp so the newest equals now', () => {
    const s = rebaseTimes(normalize(raw()), 1761980000 + 1000)
    const thrall = s.characters[1]
    expect(thrall.updatedAt).toBe(1761980000 + 1000)
    expect(thrall.bags!.seenAt).toBe(1761980000 + 1000)
    expect(thrall.bank!.seenAt).toBe(1761634400 + 1000)
    expect(thrall.professions.find((p) => p.name === 'Alchemy')!.scannedAt).toBe(1761980000 + 1000)
    expect(s.accountBank!.seenAt).toBe(1761980000 + 1000)
  })
  it('reads dungeon runs oldest first and drops invalid entries', () => {
    const s = normalize(raw())
    const thrall = s.characters.find((c) => c.name === 'Thrall')!
    expect(thrall.runs!.map((r) => r.dungeon)).toEqual(['Wailing Caverns', 'The Deadmines'])
    expect(thrall.runs![1]).toEqual({
      dungeon: 'The Deadmines',
      difficulty: 'Normal',
      startedAt: 1761970000,
      endedAt: 1761971500,
      level: 23,
      xp: 4200,
      money: 15320,
      deaths: 1,
      bosses: ["Rhahk'Zor", 'Edwin VanCleef'],
      loot: [
        { itemId: 2447, count: 3 },
        { itemId: 5200, count: 1 }
      ],
      completed: true
    })
    const jaina = s.characters.find((c) => c.name === 'Jaina')!
    expect(jaina.runs![0].difficulty).toBeUndefined()
    expect(jaina.runs![0].completed).toBeUndefined()
  })

  it('a run without a dungeon name or times is dropped', () => {
    const db = raw() as any
    db.characters['Firemaw-Jaina'].runs = [{ dungeon: 'X' }, { startedAt: 1, endedAt: 2 }]
    expect(normalize(db).characters.find((c) => c.name === 'Jaina')!.runs).toEqual([])
  })

  it('rebaseTimes shifts run times too', () => {
    const s = rebaseTimes(normalize(raw()), 1761980000 + 1000)
    const thrall = s.characters.find((c) => c.name === 'Thrall')!
    expect(thrall.runs![1].startedAt).toBe(1761970000 + 1000)
    expect(thrall.runs![1].endedAt).toBe(1761971500 + 1000)
  })
  it('a run still in progress is listed last, with loot and gold so far from bags and money', () => {
    const db = raw() as any
    const thrall = db.characters['Firemaw-Thrall']
    thrall.money = 125000
    thrall.bags = { seenAt: 1761980500, items: { 2447: 9, 765: 1 } }
    thrall.activeRun = {
      dungeon: 'City of Dalaran', startedAt: 1761979000, lastSeenAt: 1761980500, level: 24,
      xp: 1200, xpMark: 5, xpMaxMark: 10, moneyStart: 120000, deaths: 2,
      bagsStart: { 2447: 4 }, bosses: ['Atrexis the Grave Knight']
    }
    const runs = normalize(db).characters.find((c) => c.name === 'Thrall')!.runs!
    expect(runs).toHaveLength(3)
    expect(runs[2]).toEqual({
      dungeon: 'City of Dalaran',
      startedAt: 1761979000,
      endedAt: 1761980500,
      level: 24,
      xp: 1200,
      money: 5000,
      deaths: 2,
      bosses: ['Atrexis the Grave Knight'],
      loot: [
        { itemId: 765, count: 1 },
        { itemId: 2447, count: 5 }
      ],
      inProgress: true
    })
  })
})
