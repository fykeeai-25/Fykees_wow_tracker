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
  const run = () =>
    normalize(
      parseSavedVariables(
        execFileSync(lua!, [join(repo, 'addon/test/harness.lua'), join(repo, 'addon/AzerothTracker/AzerothTracker.lua')], {
          encoding: 'utf8'
        })
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
})
