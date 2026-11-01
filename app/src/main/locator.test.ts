import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { validateGameDir, listAccounts, savedVariablesPath } from './locator'
import { tempDir, fakeGame } from '../../test/tmp'

describe('locator', () => {
  it('nonexistent dir → missing-dir', () => {
    expect(validateGameDir(join(tempDir(), 'nope'))).toEqual({ ok: false, reason: 'missing-dir' })
  })

  it('dir without WTF → missing-wtf', () => {
    const d = tempDir()
    mkdirSync(join(d, 'Interface'))
    expect(validateGameDir(d)).toEqual({ ok: false, reason: 'missing-wtf' })
  })

  it('valid game dir → ok', () => {
    expect(validateGameDir(fakeGame(tempDir(), ['ACC1']))).toEqual({ ok: true })
  })

  it('lists accounts without SavedVariables folder, sorted', () => {
    const g = fakeGame(tempDir(), ['ACC2', 'ACC1'])
    expect(listAccounts(g)).toEqual(['ACC1', 'ACC2'])
  })

  it('no Account folder → []', () => {
    const d = tempDir()
    mkdirSync(join(d, 'WTF'))
    expect(listAccounts(d)).toEqual([])
  })

  it('builds SavedVariables path', () => {
    expect(savedVariablesPath('/g', 'ACC1')).toBe(
      join('/g', 'WTF', 'Account', 'ACC1', 'SavedVariables', 'AzerothTracker.lua')
    )
  })
})
