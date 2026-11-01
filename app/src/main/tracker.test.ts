import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { rmSync } from 'fs'
import { createTracker, type WatchFn } from './tracker'
import { readConfig, writeConfig } from './config'
import { tempDir, fakeGame, putSavedVariables, fixturePath, writeText } from '../../test/tmp'
import type { AppState } from '../shared/types'

function setup(accounts: string[]) {
  const root = tempDir()
  const game = fakeGame(root, accounts)
  const configFile = join(root, 'config.json')
  const states: AppState[] = []
  const watched: { file: string; onChange: () => void }[] = []
  const watch: WatchFn = (file, onChange) => {
    watched.push({ file, onChange })
    return () => {}
  }
  const tracker = createTracker({ configFile, onState: (s) => states.push(s), watch })
  return { root, game, configFile, states, watched, tracker }
}

const ready = (s: AppState) => {
  if (s.phase !== 'ready') throw new Error(`expected ready, got ${s.phase}`)
  return s
}

describe('tracker', () => {
  it('no config → needs-game-dir', () => {
    const t = setup(['ACC1'])
    t.tracker.start()
    expect(t.tracker.getState()).toEqual({ phase: 'needs-game-dir' })
    expect(t.states.at(-1)).toEqual({ phase: 'needs-game-dir' })
  })

  it('invalid game dir → needs-game-dir with reason', () => {
    const t = setup(['ACC1'])
    t.tracker.start()
    t.tracker.setGameDir(t.root)
    expect(t.tracker.getState()).toEqual({ phase: 'needs-game-dir', reason: 'missing-wtf' })
  })

  it('single account auto-selected and persisted', () => {
    const t = setup(['ACC1'])
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    const s = ready(t.tracker.getState())
    expect(s.account).toBe('ACC1')
    expect(readConfig(t.configFile)).toEqual({ gameDir: t.game, account: 'ACC1' })
  })

  it('two accounts → needs-account, then ready', () => {
    const t = setup(['ACC1', 'ACC2'])
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    expect(t.tracker.getState()).toEqual({ phase: 'needs-account', gameDir: t.game, accounts: ['ACC1', 'ACC2'] })
    t.tracker.setAccount('ACC2')
    expect(ready(t.tracker.getState()).account).toBe('ACC2')
  })

  it('file missing → missing, then appears → ok', () => {
    const t = setup(['ACC1'])
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    expect(ready(t.tracker.getState()).load).toEqual({ status: 'missing' })
    const file = putSavedVariables(t.game, 'ACC1', 'AzerothTracker.lua')
    expect(t.watched.at(-1)!.file).toBe(file)
    t.watched.at(-1)!.onChange()
    const load = ready(t.tracker.getState()).load
    if (load.status !== 'ok') throw new Error(load.status)
    expect(load.snapshot.characters).toHaveLength(2)
    expect(load.warning).toBeUndefined()
    expect(load.fileUpdatedAt).toBeGreaterThan(1700000000)
    expect(t.states.at(-1)).toEqual(t.tracker.getState())
  })

  it('truncated after good → ok with warning and previous snapshot', () => {
    const t = setup(['ACC1'])
    putSavedVariables(t.game, 'ACC1', 'AzerothTracker.lua')
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    putSavedVariables(t.game, 'ACC1', 'truncated.lua')
    t.watched.at(-1)!.onChange()
    const load = ready(t.tracker.getState()).load
    if (load.status !== 'ok') throw new Error(load.status)
    expect(load.snapshot.characters).toHaveLength(2)
    expect(load.warning).toBe('Could not read the file, showing the last valid data.')
  })

  it('file briefly missing after good → keeps last snapshot', () => {
    const t = setup(['ACC1'])
    const file = putSavedVariables(t.game, 'ACC1', 'AzerothTracker.lua')
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    rmSync(file)
    t.watched.at(-1)!.onChange()
    const load = ready(t.tracker.getState()).load
    if (load.status !== 'ok') throw new Error(load.status)
    expect(load.snapshot.characters).toHaveLength(2)
    expect(load.warning).toBeUndefined()
  })

  it('addon newer with previous good → ok with the update message', () => {
    const t = setup(['ACC1'])
    const file = putSavedVariables(t.game, 'ACC1', 'AzerothTracker.lua')
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    writeText(file, 'AzerothTrackerDB = { ["schemaVersion"] = 3 }')
    t.watched.at(-1)!.onChange()
    const load = ready(t.tracker.getState()).load
    if (load.status !== 'ok') throw new Error(load.status)
    expect(load.warning).toBe('The addon is newer than the app – please update AzerothTracker.')
  })

  it('addon newer without previous → error with the update message', () => {
    const t = setup(['ACC1'])
    const file = putSavedVariables(t.game, 'ACC1', 'AzerothTracker.lua')
    writeText(file, 'AzerothTrackerDB = { ["schemaVersion"] = 3 }')
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    expect(ready(t.tracker.getState()).load).toEqual({
      status: 'error',
      message: 'The addon is newer than the app – please update AzerothTracker.'
    })
  })

  it('truncated with no previous → error', () => {
    const t = setup(['ACC1'])
    putSavedVariables(t.game, 'ACC1', 'truncated.lua')
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    expect(ready(t.tracker.getState()).load.status).toBe('error')
  })

  it('saved config is used on start', () => {
    const t = setup(['ACC1', 'ACC2'])
    writeConfig(t.configFile, { gameDir: t.game, account: 'ACC2' })
    t.tracker.start()
    expect(ready(t.tracker.getState()).account).toBe('ACC2')
  })

  it('account folder removed then restart → needs-game-dir no-accounts', () => {
    const t = setup(['ACC1'])
    t.tracker.start()
    t.tracker.setGameDir(t.game)
    t.tracker.stop()
    rmSync(join(t.game, 'WTF', 'Account', 'ACC1'), { recursive: true })
    t.tracker.start()
    expect(t.tracker.getState()).toEqual({ phase: 'needs-game-dir', reason: 'no-accounts' })
  })

  it('fixturePath helper points at fixtures', () => {
    expect(fixturePath('x.lua')).toContain(join('test', 'fixtures'))
  })

  it('demo mode → ready with the demo account, data shifted to now', () => {
    const t = setup(['ACC1'])
    const demoRoot = tempDir()
    const demo = fakeGame(demoRoot, ['DEMO'])
    putSavedVariables(demo, 'DEMO', 'AzerothTracker.lua')
    t.tracker.start()
    t.tracker.useDemo(demo)
    const s = ready(t.tracker.getState())
    expect(s.account).toBe('DEMO')
    expect(s.demo).toBe(true)
    if (s.load.status !== 'ok') throw new Error(s.load.status)
    expect(s.load.snapshot.characters).toHaveLength(2)
    const newest = Math.max(...s.load.snapshot.characters.map((c) => c.updatedAt))
    expect(Math.abs(newest - Math.floor(Date.now() / 1000))).toBeLessThan(5)
  })

  it('choosing a real folder leaves demo mode', () => {
    const t = setup(['ACC1'])
    const demo = fakeGame(tempDir(), ['DEMO'])
    putSavedVariables(demo, 'DEMO', 'AzerothTracker.lua')
    t.tracker.start()
    t.tracker.useDemo(demo)
    t.tracker.setGameDir(t.game)
    const s = ready(t.tracker.getState())
    expect(s.demo).toBe(false)
    expect(s.account).toBe('ACC1')
  })
})
