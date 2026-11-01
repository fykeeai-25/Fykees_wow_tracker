// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Dashboard } from './Dashboard'
import { DataProvider } from './DataContext'
import { fixtureSnapshot, samplePack, FIXTURE_NOW } from '../../test/snapshot'

afterEach(cleanup)

const withData = (ui: ReactElement) => <DataProvider value={{ pack: samplePack(), source: 'bundled' }}>{ui}</DataProvider>
const thrall = () => fixtureSnapshot().characters.find((c) => c.name === 'Thrall')!

describe('Dashboard', () => {
  it('shows the Professions bubble summary', () => {
    const s = fixtureSnapshot()
    render(withData(<Dashboard character={s.characters[1]} snapshot={s} now={FIXTURE_NOW} />))
    const bubble = screen.getByRole('button', { name: /Professions/ })
    expect(bubble.textContent).toContain('Alchemy 142/150')
    expect(bubble.textContent).toContain('3 learnable now · next at 145')
    expect(bubble.textContent).toContain('Herbalism 160/225')
  })

  it('opens the full view and goes back', () => {
    const s = fixtureSnapshot()
    render(withData(<Dashboard character={thrall()} snapshot={s} now={FIXTURE_NOW} />))
    fireEvent.click(screen.getByRole('button', { name: /Professions/ }))
    expect(screen.getByRole('region', { name: 'Known' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '← Back' }))
    expect(screen.queryByRole('region', { name: 'Known' })).toBeNull()
    expect(screen.getByRole('button', { name: /Professions/ })).toBeTruthy()
  })

  it('keeps the full view when the character changes', () => {
    const s = fixtureSnapshot()
    const { rerender } = render(withData(<Dashboard character={thrall()} snapshot={s} now={FIXTURE_NOW} />))
    fireEvent.click(screen.getByRole('button', { name: /Professions/ }))
    rerender(withData(<Dashboard character={s.characters[0]} snapshot={s} now={FIXTURE_NOW} />))
    expect(screen.getByRole('button', { name: '← Back' })).toBeTruthy()
    expect(screen.getByText('This character has no professions yet.')).toBeTruthy()
  })

  it('character without professions → short summary', () => {
    const s = fixtureSnapshot()
    render(withData(<Dashboard character={s.characters[0]} snapshot={s} now={FIXTURE_NOW} />))
    expect(screen.getByRole('button', { name: /Professions/ }).textContent).toContain('No professions yet.')
  })
})
