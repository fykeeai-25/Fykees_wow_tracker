import { describe, it, expect } from 'vitest'
import { fixtureSnapshot } from '../../test/snapshot'
import { dungeonNames, durationText, filterRuns, runDuration, runRows, runTotals } from './runs'

describe('runs', () => {
  it('lists runs of all characters, newest first, with the character', () => {
    const rows = runRows(fixtureSnapshot())
    expect(rows.map((r) => `${r.characterName} ${r.run.dungeon}`)).toEqual([
      'Thrall The Deadmines',
      'Thrall Wailing Caverns',
      'Jaina The Deadmines'
    ])
    expect(rows[0].characterKey).toBe('Firemaw-Thrall')
  })

  it('filters by dungeon and by character', () => {
    const rows = runRows(fixtureSnapshot())
    expect(filterRuns(rows, { dungeon: 'The Deadmines' })).toHaveLength(2)
    expect(filterRuns(rows, { characterKey: 'Firemaw-Thrall' })).toHaveLength(2)
    expect(filterRuns(rows, { dungeon: 'The Deadmines', characterKey: 'Firemaw-Jaina' })).toHaveLength(1)
    expect(filterRuns(rows, {})).toHaveLength(3)
  })

  it('lists dungeon names once, sorted', () => {
    expect(dungeonNames(runRows(fixtureSnapshot()))).toEqual(['The Deadmines', 'Wailing Caverns'])
  })

  it('duration and its text', () => {
    expect(runDuration({ startedAt: 100, endedAt: 1600 } as never)).toBe(1500)
    expect(durationText(45)).toBe('45 s')
    expect(durationText(1500)).toBe('25 min')
    expect(durationText(3900)).toBe('1 h 05 min')
  })

  it('totals over the shown runs', () => {
    const rows = filterRuns(runRows(fixtureSnapshot()), { characterKey: 'Firemaw-Thrall' })
    expect(runTotals(rows)).toEqual({ count: 2, xp: 10300, money: 24120, deaths: 1, avgDuration: 2100 })
    expect(runTotals([])).toEqual({ count: 0, xp: 0, money: 0, deaths: 0, avgDuration: 0 })
  })
})
