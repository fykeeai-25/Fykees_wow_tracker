import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'child_process'
import { join } from 'path'
import { parseSavedVariables } from './luaParser'

const repo = join(__dirname, '../../..')
const lua = ['lua5.1', 'lua'].find((bin) => spawnSync(bin, ['-v']).status === 0)

type ProbeEvent = { t: number; e: string; zone?: string; data?: Record<string, unknown> }
type ProbeDB = {
  version: string
  client: { build: string; interface: number }
  unknownEvents: string[]
  apis: Record<string, boolean>
  events: ProbeEvent[]
}

// Runs the dungeon-run probe addon against a mocked WoW API (addon/test/probe-harness.lua).
// CI installs lua5.1; skipped locally without Lua.
describe.skipIf(!lua)('run probe addon', () => {
  const raw = () =>
    execFileSync(
      lua!,
      [join(repo, 'addon/test/probe-harness.lua'), join(repo, 'addon/AzerothTrackerProbe/AzerothTrackerProbe.lua')],
      { encoding: 'utf8' }
    )
  const run = () => parseSavedVariables(raw(), 'AzerothTrackerProbeDB') as ProbeDB
  const names = (db: ProbeDB) => db.events.map((e) => e.e)

  it('records the client and which events the client does not know', () => {
    const db = run()
    expect(db.client).toMatchObject({ build: '1.60.1', interface: 16001 })
    expect(db.unknownEvents).toContain('CHALLENGE_MODE_COMPLETED')
    expect(db.apis.GetInstanceInfo).toBe(true)
    expect(db.apis['C_ChallengeMode.GetActiveKeystoneInfo']).toBe(false)
  })

  it('logs a dungeon run in order with instance details', () => {
    const db = run()
    expect(names(db)).toEqual(
      expect.arrayContaining(['INSTANCE_ENTER', 'ENCOUNTER_START', 'ENCOUNTER_END', 'BOSS_KILL', 'PLAYER_DEAD', 'INSTANCE_LEAVE'])
    )
    const enter = db.events.find((e) => e.e === 'INSTANCE_ENTER')!
    expect(enter.data).toMatchObject({ name: 'Ragefire Chasm', instanceType: 'party', instanceId: 389, groupSize: 5 })
    const end = db.events.find((e) => e.e === 'ENCOUNTER_END')!
    expect(end.zone).toBe('Ragefire Chasm')
    expect(end.data).toMatchObject({ encounterId: 1443, name: 'Taragaman the Hungerer', success: 1 })
    const leave = db.events.find((e) => e.e === 'INSTANCE_LEAVE')!
    expect(leave.data).toMatchObject({ name: 'Ragefire Chasm', seconds: 945 })
    const order = names(db)
    expect(order.indexOf('INSTANCE_ENTER')).toBeLessThan(order.indexOf('ENCOUNTER_END'))
    expect(order.indexOf('ENCOUNTER_END')).toBeLessThan(order.indexOf('INSTANCE_LEAVE'))
  })

  it('records XP and gold gained as deltas', () => {
    const db = run()
    expect(db.events.find((e) => e.e === 'PLAYER_XP_UPDATE')!.data).toMatchObject({ gained: 650 })
    expect(db.events.find((e) => e.e === 'PLAYER_MONEY')!.data).toMatchObject({ change: 320 })
  })

  it('records only our own loot and never other players', () => {
    const out = raw()
    const db = parseSavedVariables(out, 'AzerothTrackerProbeDB') as ProbeDB
    const loot = db.events.filter((e) => e.e === 'LOOT_SELF')
    expect(loot).toHaveLength(1)
    expect(loot[0].data).toMatchObject({ itemId: 14149, name: 'Subterranean Cape' })
    expect(out).not.toMatch(/Garrosh|Felblade|0000BBBB/)
  })

  it('never listens to the combat log', () => {
    const db = run()
    expect(names(db)).not.toContain('COMBAT_LOG_EVENT_UNFILTERED')
    expect(Object.keys(db.apis)).not.toContain('CombatLogGetCurrentEventInfo')
  })
})
