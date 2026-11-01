import { existsSync, readFileSync, statSync } from 'fs'
import { join, resolve as resolvePath } from 'path'
import { watch as chokidarWatch } from 'chokidar'
import type { AppState, LoadState, TrackerSnapshot } from '../shared/types'
import { readConfig, writeConfig } from './config'
import { accountDir, listAccounts, savedVariablesPath, validateGameDir } from './locator'
import { parseSavedVariables } from './luaParser'
import { AddonNewerError, normalize } from './normalizer'

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

export const STALE_FILE_WARNING = 'Could not read the file, showing the last valid data.'

/** Windows paths are case-insensitive and may be spelled differently; compare a normalized key. */
function samePathKey(p: string): string {
  const r = resolvePath(p)
  return process.platform === 'win32' ? r.toLowerCase() : r
}

/**
 * Watches the account folder (which always exists) so the file is picked up even when
 * the addon has not written it yet. awaitWriteFinish avoids reading a half-written file.
 */
export const defaultWatch: WatchFn = (file, onChange) => {
  const dir = join(file, '..', '..')
  const watcher = chokidarWatch(dir, {
    ignoreInitial: true,
    depth: 1,
    awaitWriteFinish: { stabilityThreshold: 500 }
  })
  const target = samePathKey(file)
  watcher.on('all', (_event, changed) => {
    if (samePathKey(changed) === target) onChange()
  })
  return () => void watcher.close()
}

export function createTracker(opts: TrackerOptions): Tracker {
  const watch = opts.watch ?? defaultWatch
  let state: AppState = { phase: 'needs-game-dir' }
  let watchedFile: string | undefined
  let unwatch: (() => void) | undefined
  let lastGood: { snapshot: TrackerSnapshot; fileUpdatedAt: number } | undefined

  const emit = (s: AppState): void => {
    state = s
    opts.onState(s)
  }

  function stopWatching(): void {
    unwatch?.()
    unwatch = undefined
    watchedFile = undefined
  }

  function load(file: string): LoadState {
    // The game may replace the file while saving; keep showing the last good data meanwhile.
    if (!existsSync(file)) return lastGood ? { status: 'ok', ...lastGood } : { status: 'missing' }
    try {
      const snapshot = normalize(parseSavedVariables(readFileSync(file, 'utf8')))
      const fileUpdatedAt = Math.floor(statSync(file).mtimeMs / 1000)
      lastGood = { snapshot, fileUpdatedAt }
      return { status: 'ok', snapshot, fileUpdatedAt }
    } catch (e) {
      const warning = e instanceof AddonNewerError ? e.message : STALE_FILE_WARNING
      if (lastGood) return { status: 'ok', ...lastGood, warning }
      return { status: 'error', message: e instanceof Error ? e.message : String(e) }
    }
  }

  function resolve(): AppState {
    const cfg = readConfig(opts.configFile)
    if (!cfg.gameDir) return { phase: 'needs-game-dir' }
    const check = validateGameDir(cfg.gameDir)
    if (!check.ok) return { phase: 'needs-game-dir', reason: check.reason }
    const accounts = listAccounts(cfg.gameDir)
    if (accounts.length === 0) return { phase: 'needs-game-dir', reason: 'no-accounts' }
    let account = cfg.account && accounts.includes(cfg.account) ? cfg.account : undefined
    if (!account && accounts.length === 1) {
      account = accounts[0]
      writeConfig(opts.configFile, { ...cfg, account })
    }
    if (!account) return { phase: 'needs-account', gameDir: cfg.gameDir, accounts }
    if (!existsSync(accountDir(cfg.gameDir, account))) return { phase: 'needs-game-dir', reason: 'no-accounts' }

    const file = savedVariablesPath(cfg.gameDir, account)
    if (file !== watchedFile) {
      stopWatching()
      lastGood = undefined
      watchedFile = file
      unwatch = watch(file, () => {
        if (state.phase === 'ready') emit({ ...state, load: load(file) })
      })
    }
    return { phase: 'ready', gameDir: cfg.gameDir, account, load: load(file) }
  }

  function refresh(): void {
    const s = resolve()
    if (s.phase !== 'ready') stopWatching()
    emit(s)
  }

  return {
    start: refresh,
    setGameDir(dir) {
      writeConfig(opts.configFile, { gameDir: dir })
      refresh()
    },
    setAccount(account) {
      writeConfig(opts.configFile, { ...readConfig(opts.configFile), account })
      refresh()
    },
    getState: () => state,
    stop: stopWatching
  }
}
