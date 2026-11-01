// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SettingsPopover } from './SettingsPopover'
import type { AzerothApi } from '../shared/ipc'

afterEach(cleanup)
beforeEach(() => {
  ;(window as unknown as { azeroth: Partial<AzerothApi> }).azeroth = { getWindowPrefs: vi.fn(async () => ({ alwaysOnTop: false })) }
})

const diag = { build: '1.60.1', buildNumber: '70058', interface: 11600, addonVersion: '0.1.0', checkedAt: 0, missing: [] as string[], legacyApis: [] as string[] }

describe('SettingsPopover diagnostics', () => {
  it('shows the game client and addon version', () => {
    render(<SettingsPopover gameDir="D:\\g" account="ACC1" onClose={vi.fn()} diagnostics={diag} />)
    expect(screen.getByText('1.60.1 (interface 11600) · addon 0.1.0')).toBeTruthy()
    expect(screen.getByText('All APIs the addon needs are available.')).toBeTruthy()
  })

  it('lists missing APIs as a warning', () => {
    render(<SettingsPopover gameDir="D:\\g" account="ACC1" onClose={vi.fn()} diagnostics={{ ...diag, missing: ['GetCraftRecipeLink', 'C_CurrencyInfo.GetCurrencyListSize'] }} />)
    expect(screen.getByText('Missing in this client: GetCraftRecipeLink, C_CurrencyInfo.GetCurrencyListSize')).toBeTruthy()
  })

  it('no diagnostics yet → hint', () => {
    render(<SettingsPopover gameDir="D:\\g" account="ACC1" onClose={vi.fn()} />)
    expect(screen.getByText('Game client: log in with the addon and type /reload.')).toBeTruthy()
  })
})
