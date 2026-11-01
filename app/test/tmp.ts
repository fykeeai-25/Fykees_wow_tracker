import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const fixturePath = (name: string) => join(__dirname, 'fixtures', name)

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'azeroth-'))
}

/** Creates <root>/game/WTF/Account/<acc>/SavedVariables for each account; returns the game dir. */
export function fakeGame(root: string, accounts: string[]): string {
  const game = join(root, 'game')
  mkdirSync(join(game, 'WTF', 'Account', 'SavedVariables'), { recursive: true })
  for (const a of accounts) mkdirSync(join(game, 'WTF', 'Account', a, 'SavedVariables'), { recursive: true })
  return game
}

export function putSavedVariables(game: string, account: string, fixture: string): string {
  const file = join(game, 'WTF', 'Account', account, 'SavedVariables', 'AzerothTracker.lua')
  copyFileSync(fixturePath(fixture), file)
  return file
}

export function writeText(file: string, text: string): void {
  writeFileSync(file, text)
}
