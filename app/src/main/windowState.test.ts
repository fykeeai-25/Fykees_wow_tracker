import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { readWindowPrefs, visibleBounds, writeWindowPrefs } from './windowState'
import { tempDir, writeText } from '../../test/tmp'

const displays = [
  { x: 0, y: 0, width: 1920, height: 1080 },
  { x: 1920, y: 0, width: 1920, height: 1080 }
]

describe('window prefs', () => {
  it('round-trips', () => {
    const f = join(tempDir(), 'window.json')
    writeWindowPrefs(f, { bounds: { x: 2000, y: 50, width: 700, height: 900 }, alwaysOnTop: true })
    expect(readWindowPrefs(f)).toEqual({ bounds: { x: 2000, y: 50, width: 700, height: 900 }, alwaysOnTop: true })
  })

  it('missing or invalid file → defaults', () => {
    expect(readWindowPrefs(join(tempDir(), 'nope.json'))).toEqual({ alwaysOnTop: false })
    const f = join(tempDir(), 'window.json')
    writeText(f, '{"bounds": "x"')
    expect(readWindowPrefs(f)).toEqual({ alwaysOnTop: false })
  })

  it('keeps bounds that are visible on a display', () => {
    const b = { x: 2000, y: 50, width: 700, height: 900 }
    expect(visibleBounds(b, displays)).toEqual(b)
  })

  it('drops bounds on a monitor that is gone', () => {
    expect(visibleBounds({ x: 4000, y: 50, width: 700, height: 900 }, displays)).toBeUndefined()
  })

  it('drops bounds with less than 100×100 px on screen', () => {
    expect(visibleBounds({ x: 3790, y: 0, width: 700, height: 900 }, displays)).toBeUndefined()
    expect(visibleBounds(undefined, displays)).toBeUndefined()
  })
})
