import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowPrefs {
  bounds?: Bounds
  alwaysOnTop: boolean
}

const isBounds = (b: unknown): b is Bounds =>
  typeof b === 'object' &&
  b !== null &&
  ['x', 'y', 'width', 'height'].every((k) => typeof (b as Record<string, unknown>)[k] === 'number')

export function readWindowPrefs(file: string): WindowPrefs {
  if (!existsSync(file)) return { alwaysOnTop: false }
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    const prefs: WindowPrefs = { alwaysOnTop: raw.alwaysOnTop === true }
    if (isBounds(raw.bounds)) prefs.bounds = raw.bounds
    return prefs
  } catch {
    return { alwaysOnTop: false }
  }
}

export function writeWindowPrefs(file: string, prefs: WindowPrefs): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(prefs, null, 2))
}

/** Saved bounds, if at least 100×100 px of the window would be on some display. */
export function visibleBounds(bounds: Bounds | undefined, displays: Bounds[]): Bounds | undefined {
  if (!bounds) return undefined
  const onScreen = displays.some((d) => {
    const w = Math.min(bounds.x + bounds.width, d.x + d.width) - Math.max(bounds.x, d.x)
    const h = Math.min(bounds.y + bounds.height, d.y + d.height) - Math.max(bounds.y, d.y)
    return w >= 100 && h >= 100
  })
  return onScreen ? bounds : undefined
}
