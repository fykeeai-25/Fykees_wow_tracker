import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSavedVariables, LuaParseError } from './luaParser'

const fixture = (name: string) => readFileSync(join(__dirname, '../../test/fixtures', name), 'utf8')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

describe('parseSavedVariables', () => {
  it('parses fixture', () => {
    const db = parseSavedVariables(fixture('AzerothTracker.lua')) as Any
    expect(db.schemaVersion).toBe(1)
    expect(db.characters['Firemaw-Thrall'].professions.Alchemy.skill).toBe(142)
    expect(db.characters['Firemaw-Thrall'].bags.items[2447]).toBe(4)
  })

  it('array-like tables become arrays', () => {
    const db = parseSavedVariables(fixture('AzerothTracker.lua')) as Any
    const reagents = db.characters['Firemaw-Thrall'].professions.Alchemy.recipes['Minor Healing Potion'].reagents
    expect(Array.isArray(reagents)).toBe(true)
    expect(reagents).toHaveLength(2)
    expect(reagents[0]).toEqual({ itemId: 2447, count: 1 })
  })

  it('numeric keys stay usable', () => {
    const db = parseSavedVariables(fixture('AzerothTracker.lua')) as Any
    expect(db.itemNames[2447]).toBe('Peacebloom')
    expect(Object.keys(db.itemNames)).toContain('2447')
  })

  it('throws LuaParseError on truncated file', () => {
    expect(() => parseSavedVariables(fixture('truncated.lua'))).toThrow(LuaParseError)
  })

  it('throws LuaParseError when variable missing', () => {
    expect(() => parseSavedVariables('Other = {}')).toThrow(LuaParseError)
  })

  it('decodes UTF-8', () => {
    const x = parseSavedVariables('X = { ["n"] = "Žluťoučký" }', 'X') as Any
    expect(x.n).toBe('Žluťoučký')
  })

  it('handles escaped strings', () => {
    const x = parseSavedVariables('X = { ["a"] = "it\\\'s \\"q\\"" }', 'X') as Any
    expect(x.a).toBe('it\'s "q"')
  })

  it('handles negative numbers, booleans and nil', () => {
    const x = parseSavedVariables('X = { ["n"] = -5, ["b"] = true, ["z"] = nil }', 'X') as Any
    expect(x).toEqual({ n: -5, b: true, z: null })
  })
})
