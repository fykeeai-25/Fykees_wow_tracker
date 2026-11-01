import { describe, it, expect } from 'vitest'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { defaultWatch } from './tracker'
import { tempDir } from '../../test/tmp'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Real chokidar on the real file system (also runs on windows-latest in the release workflow).
async function changeIsSeen(fileArg: (dir: string) => string): Promise<boolean> {
  const account = join(tempDir(), 'WTF', 'Account', 'ACC1')
  const svDir = join(account, 'SavedVariables')
  mkdirSync(svDir, { recursive: true })
  let seen = false
  const stop = defaultWatch(fileArg(svDir), () => (seen = true))
  try {
    await delay(500)
    writeFileSync(join(svDir, 'AzerothTracker.lua'), 'AzerothTrackerDB = { ["schemaVersion"] = 1 }')
    for (let i = 0; i < 40 && !seen; i++) await delay(100)
    return seen
  } finally {
    stop()
  }
}

describe('defaultWatch (real file system)', () => {
  it('fires when the addon creates the SavedVariables file', async () => {
    expect(await changeIsSeen((d) => join(d, 'AzerothTracker.lua'))).toBe(true)
  }, 10000)

  it('fires even when the watched path is spelled differently', async () => {
    expect(await changeIsSeen((d) => join(d, '..', 'SavedVariables', 'AzerothTracker.lua'))).toBe(true)
  }, 10000)

  it('ignores other SavedVariables files', async () => {
    const account = join(tempDir(), 'WTF', 'Account', 'ACC1')
    const svDir = join(account, 'SavedVariables')
    mkdirSync(svDir, { recursive: true })
    let seen = false
    const stop = defaultWatch(join(svDir, 'AzerothTracker.lua'), () => (seen = true))
    await delay(500)
    writeFileSync(join(svDir, 'OtherAddon.lua'), 'X = {}')
    await delay(1500)
    stop()
    expect(seen).toBe(false)
  }, 10000)
})
