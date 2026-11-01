// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SetupScreen } from './SetupScreen'

afterEach(cleanup)

describe('SetupScreen', () => {
  it('shows missing-wtf reason and choose button', () => {
    const onChooseDir = vi.fn()
    render(
      <SetupScreen state={{ phase: 'needs-game-dir', reason: 'missing-wtf' }} onChooseDir={onChooseDir} onSelectAccount={vi.fn()} />
    )
    expect(screen.getByText("That isn't the game folder. Pick the one with Interface and WTF, usually …\\_forever_.")).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Choose game folder' }))
    expect(onChooseDir).toHaveBeenCalled()
  })

  it('shows other reasons', () => {
    const { rerender } = render(
      <SetupScreen state={{ phase: 'needs-game-dir', reason: 'missing-dir' }} onChooseDir={vi.fn()} onSelectAccount={vi.fn()} />
    )
    expect(screen.getByText('This folder does not exist.')).toBeTruthy()
    rerender(<SetupScreen state={{ phase: 'needs-game-dir', reason: 'no-accounts' }} onChooseDir={vi.fn()} onSelectAccount={vi.fn()} />)
    expect(screen.getByText('No WoW account found in WTF/Account. Log in to the game once, then try again.')).toBeTruthy()
  })

  it('lets the user pick one of several accounts', () => {
    const onSelectAccount = vi.fn()
    render(
      <SetupScreen
        state={{ phase: 'needs-account', gameDir: 'D:\\WoW\\_forever_', accounts: ['ACC1', 'ACC2'] }}
        onChooseDir={vi.fn()}
        onSelectAccount={onSelectAccount}
      />
    )
    expect(screen.getByText('Several accounts found. Which one should AzerothTracker follow?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'ACC1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ACC2' }))
    expect(onSelectAccount).toHaveBeenCalledWith('ACC2')
  })
})
