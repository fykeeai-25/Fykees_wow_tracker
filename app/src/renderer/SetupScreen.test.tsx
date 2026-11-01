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
    expect(screen.getByText('Ve složce chybí WTF – vyber složku, kde jsou Interface a WTF.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Vybrat složku hry' }))
    expect(onChooseDir).toHaveBeenCalled()
  })

  it('shows other reasons', () => {
    const { rerender } = render(
      <SetupScreen state={{ phase: 'needs-game-dir', reason: 'missing-dir' }} onChooseDir={vi.fn()} onSelectAccount={vi.fn()} />
    )
    expect(screen.getByText('Složka neexistuje.')).toBeTruthy()
    rerender(<SetupScreen state={{ phase: 'needs-game-dir', reason: 'no-accounts' }} onChooseDir={vi.fn()} onSelectAccount={vi.fn()} />)
    expect(screen.getByText('Ve složce WTF/Account není žádný účet – přihlas se jednou do hry.')).toBeTruthy()
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
    expect(screen.getByRole('button', { name: 'ACC1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ACC2' }))
    expect(onSelectAccount).toHaveBeenCalledWith('ACC2')
  })
})
