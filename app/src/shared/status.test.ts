import { describe, it, expect } from 'vitest'
import { statusText } from './status'
import { fixtureSnapshot } from '../../test/snapshot'

// 2025-11-01 14:32 Europe/Prague
const AT_1432 = 1762003920

describe('statusText', () => {
  const ok = { status: 'ok' as const, snapshot: fixtureSnapshot(), fileUpdatedAt: AT_1432 }

  it('same day → time only', () => {
    expect(statusText(ok, AT_1432 + 3600, 'Europe/Prague')).toBe('Data from /reload at 14:32')
  })

  it('other day → date and time', () => {
    expect(statusText(ok, AT_1432 + 2 * 86400, 'Europe/Prague')).toBe('Data from /reload on 1 Nov at 14:32')
  })

  it('warning is appended', () => {
    expect(statusText({ ...ok, warning: 'Careful' }, AT_1432 + 60, 'Europe/Prague')).toBe('Data from /reload at 14:32 – Careful')
  })

  it('missing', () => {
    expect(statusText({ status: 'missing' }, 0)).toBe('No data yet – install the addon, log in and type /reload.')
  })

  it('error', () => {
    expect(statusText({ status: 'error', message: 'boom' }, 0)).toBe('Load error: boom')
  })
})
