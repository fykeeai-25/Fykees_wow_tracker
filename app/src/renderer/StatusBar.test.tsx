// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StatusBar } from './StatusBar'
import { samplePack } from '../../test/snapshot'

afterEach(cleanup)

describe('StatusBar', () => {
  it('shows the data version', () => {
    render(<StatusBar load={{ status: 'missing' }} now={0} data={{ pack: samplePack(12), source: 'downloaded' }} />)
    expect(screen.getByText(/Data v12/)).toBeTruthy()
  })

  it('explains a failed update check in the tooltip', () => {
    render(
      <StatusBar
        load={{ status: 'missing' }}
        now={0}
        data={{ pack: samplePack(3), source: 'bundled', lastCheck: { at: 0, ok: false, error: 'timeout' } }}
      />
    )
    expect(screen.getByText(/Data v3/).getAttribute('title')).toBe('Data update check failed: timeout')
  })
})

describe('StatusBar age', () => {
  it('turns amber when the last reload is older than 30 minutes', () => {
    const load = { status: 'ok' as const, snapshot: { schemaVersion: 2, characters: [], itemNames: {} }, fileUpdatedAt: 1000 }
    const { container, rerender } = render(<StatusBar load={load} now={1000 + 600} />)
    expect(container.querySelector('footer')!.className).not.toContain('old')
    rerender(<StatusBar load={load} now={1000 + 7200} />)
    expect(container.querySelector('footer')!.className).toContain('old')
    expect(screen.getByText('Last /reload 2 h ago')).toBeTruthy()
  })
})
