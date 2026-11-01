// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { App } from './App'
import { fixtureSnapshot, samplePack } from '../../test/snapshot'
import type { AzerothApi } from '../shared/ipc'

afterEach(cleanup)

let api: AzerothApi
beforeEach(() => {
  api = {
    getState: async () => ({
      phase: 'ready',
      gameDir: 'D:\\Games\\World of Warcraft\\_forever_',
      account: 'ACC1',
      load: { status: 'ok', snapshot: fixtureSnapshot(), fileUpdatedAt: Math.floor(Date.now() / 1000) }
    }),
    onState: () => () => {},
    chooseGameDir: vi.fn(async () => {}),
    setAccount: vi.fn(async () => {}),
    useDemo: vi.fn(async () => {}),
    getData: async () => ({ pack: samplePack(4), source: 'bundled' }),
    onData: () => () => {},
    getWindowPrefs: async () => ({ alwaysOnTop: false }),
    setAlwaysOnTop: vi.fn(async () => {}),
    openWowhead: vi.fn(async () => {})
  }
  ;(window as unknown as { azeroth: AzerothApi }).azeroth = api
})

describe('App dashboard layout', () => {
  it('shows characters, bubbles and search together', async () => {
    render(<App />)
    expect(await screen.findByLabelText('Find item')).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Characters' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Professions/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Alts' })).toBeNull()
  })

  it('selecting a character changes the bubbles', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Thrall/ }))
    expect(screen.getByRole('button', { name: /Professions/ }).textContent).toContain('Alchemy 142/150')
    fireEvent.click(screen.getByRole('button', { name: /Jaina/ }))
    expect(screen.getByRole('button', { name: /Professions/ }).textContent).toContain('No professions yet.')
  })

  it('top bar shows status and data version; search toggle flips aria-expanded', async () => {
    render(<App />)
    const toggle = await screen.findByRole('button', { name: 'Toggle search' })
    expect(screen.getByRole('banner').textContent).toContain('Updated')
    expect(screen.getByRole('banner').textContent).toContain('Data v4')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('App settings popover', () => {
  it('opens from the gear, toggles always-on-top and closes on Escape', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog.textContent).toContain('D:\\Games\\World of Warcraft\\_forever_')
    fireEvent.click(screen.getByLabelText('Always on top'))
    expect(api.setAlwaysOnTop).toHaveBeenCalledWith(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull())
  })

  it('opens Wowhead for a recipe', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Thrall/ }))
    fireEvent.click(screen.getByRole('button', { name: /Professions/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Open Minor Healing Potion on Wowhead' })[0])
    expect(api.openWowhead).toHaveBeenCalledWith('https://www.wowhead.com/forever/spell=2330')
  })
})
