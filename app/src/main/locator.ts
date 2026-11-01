export type GameDirCheck = { ok: true } | { ok: false; reason: 'missing-dir' | 'missing-wtf' }

export function validateGameDir(_dir: string): GameDirCheck {
  throw new Error('not implemented')
}

export function listAccounts(_gameDir: string): string[] {
  throw new Error('not implemented')
}

export function savedVariablesPath(_gameDir: string, _account: string): string {
  throw new Error('not implemented')
}
