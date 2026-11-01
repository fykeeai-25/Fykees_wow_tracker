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
