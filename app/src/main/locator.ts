import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

export type GameDirCheck = { ok: true } | { ok: false; reason: 'missing-dir' | 'missing-wtf' }

const isDir = (p: string): boolean => existsSync(p) && statSync(p).isDirectory()

/** The game dir is the folder that contains Interface and WTF (e.g. ...\World of Warcraft\_forever_). */
export function validateGameDir(dir: string): GameDirCheck {
  if (!isDir(dir)) return { ok: false, reason: 'missing-dir' }
  if (!isDir(join(dir, 'WTF'))) return { ok: false, reason: 'missing-wtf' }
  return { ok: true }
}

export function accountDir(gameDir: string, account: string): string {
  return join(gameDir, 'WTF', 'Account', account)
}

export function listAccounts(gameDir: string): string[] {
  const root = join(gameDir, 'WTF', 'Account')
  if (!isDir(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'SavedVariables')
    .map((e) => e.name)
    .sort()
}

export function savedVariablesPath(gameDir: string, account: string): string {
  return join(accountDir(gameDir, account), 'SavedVariables', 'AzerothTracker.lua')
}
