import type { AppState } from '../shared/types'

export type WatchFn = (file: string, onChange: () => void) => () => void

export interface TrackerOptions {
  configFile: string
  onState: (s: AppState) => void
  watch?: WatchFn
}

export interface Tracker {
  start(): void
  setGameDir(dir: string): void
  setAccount(account: string): void
  getState(): AppState
  stop(): void
}

export function createTracker(_opts: TrackerOptions): Tracker {
  throw new Error('not implemented')
}
