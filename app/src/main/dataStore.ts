import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { DataPack, DataState } from '../shared/types'

/** Published by .github/workflows/data.yml. Never shown in the UI. */
export const DATA_PACK_URL = 'https://github.com/fykeeai-25/Fykees_wow_tracker/releases/download/data-latest/data-pack.json'

export type RemoteFetch = (url: string, signal: AbortSignal) => Promise<string>

export interface DataStoreOptions {
  bundledFile: string
  userFile: string
  fetchText: RemoteFetch
  onChange(s: DataState): void
  url?: string
  timeoutMs?: number
  now?: () => number
}

export interface DataStore {
  get(): DataState
  refresh(): Promise<void>
}

class CheckError extends Error {}

function parsePack(text: string): DataPack | undefined {
  try {
    const p = JSON.parse(text) as DataPack
    const m = p?.manifest
    if (typeof m?.dataSchema !== 'number' || typeof m.dataVersion !== 'number') return undefined
    if (typeof p.items !== 'object' || !Array.isArray(p.professions)) return undefined
    return p
  } catch {
    return undefined
  }
}

function readPack(file: string): DataPack | undefined {
  if (!existsSync(file)) return undefined
  try {
    return parsePack(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * Game data: the pack bundled with the app, a newer downloaded copy in userData, and a
 * silent check for a newer published pack. Any failure keeps the data the app already has.
 */
export function createDataStore(opts: DataStoreOptions): DataStore {
  const url = opts.url ?? DATA_PACK_URL
  const timeoutMs = opts.timeoutMs ?? 10_000
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000))

  const bundled = readPack(opts.bundledFile)
  if (!bundled) throw new Error(`Bundled game data missing or invalid: ${opts.bundledFile}`)
  const schema = bundled.manifest.dataSchema
  const user = readPack(opts.userFile)
  let state: DataState =
    user && user.manifest.dataSchema === schema && user.manifest.dataVersion > bundled.manifest.dataVersion
      ? { pack: user, source: 'downloaded' }
      : { pack: bundled, source: 'bundled' }

  async function fetchWithTimeout(target: string): Promise<string> {
    const ctrl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new CheckError('timeout')) // settle the race before the fetch sees the abort
        ctrl.abort()
      }, timeoutMs)
    })
    try {
      return await Promise.race([opts.fetchText(target, ctrl.signal), timeout])
    } finally {
      clearTimeout(timer)
    }
  }

  async function check(): Promise<DataPack | undefined> {
    const expected = (await fetchWithTimeout(`${url}.sha256`)).trim()
    const text = await fetchWithTimeout(url)
    if (createHash('sha256').update(text).digest('hex') !== expected) throw new CheckError('checksum mismatch')
    const remote = parsePack(text)
    if (!remote) throw new CheckError('invalid data pack')
    if (remote.manifest.dataSchema !== schema) throw new CheckError('incompatible data schema')
    if (remote.manifest.dataVersion <= state.pack.manifest.dataVersion) return undefined
    mkdirSync(dirname(opts.userFile), { recursive: true })
    writeFileSync(opts.userFile, text)
    return remote
  }

  return {
    get: () => state,
    async refresh() {
      try {
        const newer = await check()
        state = newer
          ? { pack: newer, source: 'downloaded', lastCheck: { at: now(), ok: true } }
          : { ...state, lastCheck: { at: now(), ok: true } }
      } catch (e) {
        state = { ...state, lastCheck: { at: now(), ok: false, error: e instanceof Error ? e.message : String(e) } }
      }
      opts.onChange(state)
    }
  }
}
