import type { DataState } from '../shared/types'

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

export function createDataStore(_opts: DataStoreOptions): DataStore {
  throw new Error('not implemented')
}
