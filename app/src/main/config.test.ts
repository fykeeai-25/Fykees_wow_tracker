import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { readConfig, writeConfig } from './config'
import { tempDir, writeText } from '../../test/tmp'

describe('config', () => {
  it('round-trips', () => {
    const f = join(tempDir(), 'config.json')
    writeConfig(f, { gameDir: 'D:\\Hry\\WoW\\_forever_', account: 'ACC1' })
    expect(readConfig(f)).toEqual({ gameDir: 'D:\\Hry\\WoW\\_forever_', account: 'ACC1' })
  })

  it('missing file → {}', () => {
    expect(readConfig(join(tempDir(), 'nope.json'))).toEqual({})
  })

  it('invalid json → {}', () => {
    const f = join(tempDir(), 'config.json')
    writeText(f, 'not json')
    expect(readConfig(f)).toEqual({})
  })

  it('creates parent folder when writing', () => {
    const f = join(tempDir(), 'sub', 'config.json')
    writeConfig(f, { gameDir: '/g' })
    expect(readConfig(f)).toEqual({ gameDir: '/g' })
  })
})
