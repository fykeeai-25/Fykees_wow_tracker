import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createDataStore, type RemoteFetch } from './dataStore'
import { tempDir } from '../../test/tmp'
import { samplePack } from '../../test/snapshot'
import type { DataPack, DataState } from '../shared/types'

const URL_ = 'https://example.test/data-pack.json'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const packText = (version: number, dataSchema = 1) => {
  const p: DataPack = samplePack(version)
  p.manifest.dataSchema = dataSchema
  return JSON.stringify(p)
}

function setup(opts: { bundled?: number; user?: string; remote?: string; remoteSha?: string; fetch?: RemoteFetch; timeoutMs?: number } = {}) {
  const dir = tempDir()
  const bundledFile = join(dir, 'bundled.json')
  const userFile = join(dir, 'user', 'data-pack.json')
  writeFileSync(bundledFile, packText(opts.bundled ?? 1))
  if (opts.user !== undefined) {
    require('fs').mkdirSync(join(dir, 'user'), { recursive: true })
    writeFileSync(userFile, opts.user)
  }
  const fetchText: RemoteFetch =
    opts.fetch ??
    (async (url) => {
      if (opts.remote === undefined) throw new Error('offline')
      return url.endsWith('.sha256') ? (opts.remoteSha ?? sha(opts.remote)) + '\n' : opts.remote
    })
  const changes: DataState[] = []
  const store = createDataStore({
    bundledFile,
    userFile,
    fetchText,
    url: URL_,
    timeoutMs: opts.timeoutMs,
    now: () => 1000,
    onChange: (s) => changes.push(s)
  })
  return { store, userFile, changes }
}

describe('dataStore', () => {
  it('uses the bundled pack when there is no downloaded one', () => {
    const { store } = setup({ bundled: 1 })
    expect(store.get().source).toBe('bundled')
    expect(store.get().pack.manifest.dataVersion).toBe(1)
  })

  it('uses a newer downloaded pack', () => {
    const { store } = setup({ bundled: 1, user: packText(5) })
    expect(store.get()).toMatchObject({ source: 'downloaded', pack: { manifest: { dataVersion: 5 } } })
  })

  it('ignores a downloaded pack that is not newer', () => {
    const { store } = setup({ bundled: 5, user: packText(3) })
    expect(store.get().source).toBe('bundled')
  })

  it('falls back to bundled when the downloaded file is corrupt', () => {
    const { store } = setup({ bundled: 1, user: '{"manifest": {"dataVer' })
    expect(store.get().source).toBe('bundled')
  })

  it('ignores a downloaded pack with another data schema', () => {
    const { store } = setup({ bundled: 1, user: packText(9, 2) })
    expect(store.get().source).toBe('bundled')
  })

  it('refresh adopts a newer remote pack and saves it', async () => {
    const remote = packText(7)
    const { store, userFile, changes } = setup({ bundled: 1, remote })
    await store.refresh()
    expect(store.get()).toMatchObject({ source: 'downloaded', pack: { manifest: { dataVersion: 7 } }, lastCheck: { at: 1000, ok: true } })
    expect(readFileSync(userFile, 'utf8')).toBe(remote)
    expect(changes.at(-1)).toEqual(store.get())
  })

  it('refresh keeps current data when the remote is older or equal', async () => {
    const { store, userFile } = setup({ bundled: 4, remote: packText(4) })
    await store.refresh()
    expect(store.get()).toMatchObject({ source: 'bundled', lastCheck: { ok: true } })
    expect(existsSync(userFile)).toBe(false)
  })

  it('refresh rejects a checksum mismatch', async () => {
    const { store, userFile } = setup({ bundled: 1, remote: packText(7), remoteSha: 'deadbeef' })
    await store.refresh()
    expect(store.get()).toMatchObject({ source: 'bundled', lastCheck: { ok: false, error: 'checksum mismatch' } })
    expect(existsSync(userFile)).toBe(false)
  })

  it('refresh ignores a remote pack with another data schema', async () => {
    const { store } = setup({ bundled: 1, remote: packText(9, 2) })
    await store.refresh()
    expect(store.get()).toMatchObject({ source: 'bundled', lastCheck: { ok: false, error: 'incompatible data schema' } })
  })

  it('refresh offline keeps working and records the error', async () => {
    const { store, changes } = setup({ bundled: 1 })
    await store.refresh()
    expect(store.get()).toMatchObject({ source: 'bundled', lastCheck: { ok: false, error: 'offline' } })
    expect(changes).toHaveLength(1)
  })

  it('refresh times out', async () => {
    const hang: RemoteFetch = (_url, signal) =>
      new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
    const { store } = setup({ bundled: 1, fetch: hang, timeoutMs: 50 })
    await store.refresh()
    expect(store.get()).toMatchObject({ source: 'bundled', lastCheck: { ok: false, error: 'timeout' } })
  })
})
