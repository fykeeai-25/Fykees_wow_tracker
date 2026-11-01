import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'

export interface Config {
  gameDir?: string
  account?: string
  demo?: boolean
}

export function readConfig(file: string): Config {
  if (!existsSync(file)) return {}
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown
    if (typeof raw !== 'object' || raw === null) return {}
    const r = raw as Record<string, unknown>
    const cfg: Config = {}
    if (typeof r.gameDir === 'string') cfg.gameDir = r.gameDir
    if (typeof r.account === 'string') cfg.account = r.account
    if (r.demo === true) cfg.demo = true
    return cfg
  } catch {
    return {}
  }
}

export function writeConfig(file: string, cfg: Config): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(cfg, null, 2))
}
