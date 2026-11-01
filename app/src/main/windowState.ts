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

export function readWindowPrefs(_file: string): WindowPrefs {
  throw new Error('not implemented')
}

export function writeWindowPrefs(_file: string, _prefs: WindowPrefs): void {
  throw new Error('not implemented')
}

export function visibleBounds(_bounds: Bounds | undefined, _displays: Bounds[]): Bounds | undefined {
  throw new Error('not implemented')
}
