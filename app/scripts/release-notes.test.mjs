import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { checksums, sumsFile, releaseNotes } from './release-notes.mjs'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function tmpFiles() {
  const dir = mkdtempSync(join(tmpdir(), 'notes-'))
  const a = join(dir, 'AzerothTracker-0.1.0-win-x64.zip')
  const b = join(dir, 'AzerothTracker-addon-v0.1.0.zip')
  writeFileSync(a, 'app bytes')
  writeFileSync(b, 'addon bytes')
  return [a, b]
}
const sha = (s) => createHash('sha256').update(s).digest('hex')

describe('release checksums', () => {
  it('computes SHA-256 per file, keyed by file name', async () => {
    const [a, b] = tmpFiles()
    const sums = await checksums([a, b])
    expect(sums).toEqual([
      { name: 'AzerothTracker-0.1.0-win-x64.zip', sha256: sha('app bytes') },
      { name: 'AzerothTracker-addon-v0.1.0.zip', sha256: sha('addon bytes') }
    ])
  })

  it('writes a sha256sum-compatible SHA256SUMS.txt', () => {
    const text = sumsFile([{ name: 'x.zip', sha256: 'ab'.repeat(32) }])
    expect(text).toBe(`${'ab'.repeat(32)}  x.zip\n`)
  })

  it('release notes list every file with its checksum and explain the zip', () => {
    const notes = releaseNotes([
      { name: 'AzerothTracker-0.1.0-win-x64.zip', sha256: '1'.repeat(64) },
      { name: 'AzerothTracker-addon-v0.1.0.zip', sha256: '2'.repeat(64) }
    ])
    expect(notes).toContain('AzerothTracker-0.1.0-win-x64.zip')
    expect(notes).toContain('1'.repeat(64))
    expect(notes).toContain('2'.repeat(64))
    expect(notes).toMatch(/Get-FileHash/)
    expect(notes).toMatch(/unzip/i)
    expect(notes).not.toMatch(/portable/i)
    expect(notes).not.toMatch(/fyk[e]e/i)
  })
})

describe('Windows build config', () => {
  it('builds a zip, not a self-extracting portable exe', () => {
    const yml = readFileSync(join(appDir, 'electron-builder.yml'), 'utf8')
    expect(yml).toMatch(/target:\s*zip/)
    expect(yml).not.toMatch(/portable/)
    const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'))
    expect(pkg.scripts['dist:win']).not.toMatch(/portable/)
  })
})
