// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { ProfessionsView } from './ProfessionsView'
import { fixtureSnapshot, FIXTURE_NOW } from '../../../test/snapshot'

afterEach(cleanup)

function openThrall(profession: string) {
  render(<ProfessionsView snapshot={fixtureSnapshot()} now={FIXTURE_NOW} />)
  fireEvent.click(screen.getByRole('button', { name: /Thrall/ }))
  fireEvent.click(screen.getByRole('button', { name: new RegExp(profession) }))
}

describe('ProfessionsView', () => {
  it('lists all characters', () => {
    render(<ProfessionsView snapshot={fixtureSnapshot()} now={FIXTURE_NOW} />)
    expect(screen.getByRole('button', { name: /Thrall/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Jaina/ })).toBeTruthy()
  })

  it('shows Alchemy skill and recipe sections', () => {
    openThrall('Alchemy')
    expect(screen.getAllByText('142/150').length).toBeGreaterThan(0)
    const next = screen.getByRole('region', { name: 'Po dalším skillupu' })
    expect(within(next).getByText('Elixir of Wisdom')).toBeTruthy()
    const known = screen.getByRole('region', { name: 'Umím' })
    expect(within(known).getByText('Minor Healing Potion')).toBeTruthy()
  })

  it('opens materials across characters with stale bank', () => {
    openThrall('Alchemy')
    fireEvent.click(screen.getByText('Minor Healing Potion'))
    const panel = screen.getByRole('region', { name: 'Materiály' })
    expect(within(panel).getByText('Peacebloom')).toBeTruthy()
    expect(within(panel).getByText('1 / 32')).toBeTruthy()
    const stale = panel.querySelector('.stale')
    expect(stale?.textContent).toContain('banka')
    expect(within(panel).getByText(/Jaina – taška 3/)).toBeTruthy()
    expect(within(panel).getByText(/Banka účtu 20/)).toBeTruthy()
  })

  it('quantity scales needed amounts', () => {
    openThrall('Alchemy')
    fireEvent.click(screen.getByText('Minor Healing Potion'))
    fireEvent.change(screen.getByLabelText('Počet'), { target: { value: '5' } })
    expect(screen.getByText('5 / 3')).toBeTruthy()
  })

  it('gathering profession shows only skill', () => {
    openThrall('Herbalism')
    expect(screen.getAllByText('160/225').length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'Umím' })).toBeNull()
  })

  it('unscanned crafting profession asks to open the window', () => {
    const s = fixtureSnapshot()
    const thrall = s.characters.find((c) => c.name === 'Thrall')!
    delete thrall.professions.find((p) => p.name === 'Alchemy')!.knownRecipes
    render(<ProfessionsView snapshot={s} now={FIXTURE_NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /Thrall/ }))
    fireEvent.click(screen.getByRole('button', { name: /Alchemy/ }))
    expect(screen.getByText('Otevři okno profese ve hře a dej /reload.')).toBeTruthy()
  })

  it('character without professions', () => {
    render(<ProfessionsView snapshot={fixtureSnapshot()} now={FIXTURE_NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /Jaina/ }))
    expect(screen.getByText('Tahle postava zatím nemá žádnou profesi.')).toBeTruthy()
  })

  it('empty snapshot', () => {
    render(<ProfessionsView snapshot={{ schemaVersion: 1, characters: [], itemNames: {} }} now={FIXTURE_NOW} />)
    expect(screen.getByText('Zatím žádné postavy – přihlas se a dej /reload.')).toBeTruthy()
  })
})
