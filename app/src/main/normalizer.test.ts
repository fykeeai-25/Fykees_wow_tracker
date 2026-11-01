import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSavedVariables } from './luaParser'
import { normalize } from './normalizer'

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
    const s = normalize({ schemaVersion: 1 })
    expect(s.characters).toEqual([])
    expect(s.itemNames).toEqual({})
    expect(s.accountBank).toBeUndefined()
  })

  it('drops wrongly typed fields instead of throwing', () => {
    const s = normalize({
      schemaVersion: 1,
      characters: { 'R-X': { name: 'X', level: 'high', professions: 'nope', bags: { items: { 5: 'two' } } } }
    })
    expect(s.characters[0].level).toBe(0)
    expect(s.characters[0].professions).toEqual([])
    expect(s.characters[0].bags).toBeUndefined()
  })

  it('rejects other schemaVersion', () => {
    expect(() => normalize({ schemaVersion: 2 })).toThrow('Unsupported schemaVersion 2')
  })
})
