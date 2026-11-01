import { describe, it, expect } from 'vitest'
import { agoText, isOld, statusText } from './status'
import { fixtureSnapshot } from '../../test/snapshot'

// 2025-11-01 14:32 Europe/Prague
const AT_1432 = 1762003920

describe('agoText', () => {
  it.each([
    [0, 'just now'],
    [59, 'just now'],
    [60, '1 min ago'],
    [3599, '59 min ago'],
    [3600, '1 h ago'],
    [86399, '23 h ago'],
    [86400, '1 day ago'],
    [172800, '2 days ago']
  ])('%i s → %s', (s, text) => {
    expect(agoText(s)).toBe(text)
  })
})

describe('statusText', () => {
  const ok = { status: 'ok' as const, snapshot: fixtureSnapshot(), fileUpdatedAt: AT_1432 }

  it('fresh → time and age', () => {
    expect(statusText(ok, AT_1432 + 240, 'Europe/Prague')).toBe('Updated 14:32 · 4 min ago')
  })

  it('older than 30 min → last reload age', () => {
    expect(statusText(ok, AT_1432 + 7200, 'Europe/Prague')).toBe('Last /reload 2 h ago')
    expect(statusText(ok, AT_1432 + 2 * 86400, 'Europe/Prague')).toBe('Last /reload 2 days ago')
  })

  it('warning is appended', () => {
    expect(statusText({ ...ok, warning: 'Careful' }, AT_1432 + 60, 'Europe/Prague')).toBe('Updated 14:32 · 1 min ago – Careful')
  })

  it('missing', () => {
    expect(statusText({ status: 'missing' }, 0)).toBe('No data yet – install the addon, log in and type /reload.')
  })

  it('error', () => {
    expect(statusText({ status: 'error', message: 'boom' }, 0)).toBe('Load error: boom')
  })

  it('isOld after 30 minutes', () => {
    expect(isOld(ok, AT_1432 + 1800)).toBe(false)
    expect(isOld(ok, AT_1432 + 1801)).toBe(true)
    expect(isOld({ status: 'missing' }, AT_1432)).toBe(false)
  })
})
