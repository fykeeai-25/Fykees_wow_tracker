export interface Config {
  gameDir?: string
  account?: string
}

export function readConfig(_file: string): Config {
  throw new Error('not implemented')
}

export function writeConfig(_file: string, _cfg: Config): void {
  throw new Error('not implemented')
}
