// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ProfessionsView } from './ProfessionsView'
import { DataProvider } from '../DataContext'
import { fixtureSnapshot, samplePack, FIXTURE_NOW } from '../../../test/snapshot'

afterEach(cleanup)

const withData = (ui: ReactElement) => <DataProvider value={{ pack: samplePack(), source: 'bundled' }}>{ui}</DataProvider>

function openThrall(profession: string) {
  render(withData(<ProfessionsView snapshot={fixtureSnapshot()} now={FIXTURE_NOW} />))
  fireEvent.click(screen.getByRole('button', { name: /Thrall/ }))
  fireEvent.click(screen.getByRole('button', { name: new RegExp(profession) }))
}

describe('ProfessionsView', () => {
  it('lists characters with class colour and level line', () => {
    render(withData(<ProfessionsView snapshot={fixtureSnapshot()} now={FIXTURE_NOW} />))
    const thrall = screen.getByRole('button', { name: /Thrall/ })
    expect(within(thrall).getByText('Lv 24 Shaman · Firemaw')).toBeTruthy()
    expect((within(thrall).getByText('Thrall') as HTMLElement).style.color).toBe('rgb(0, 112, 221)')
    expect(screen.getByRole('button', { name: /Jaina/ })).toBeTruthy()
  })

  it('shows Alchemy skill and recipe sections', () => {
    openThrall('Alchemy')
    expect(screen.getAllByText('142/150').length).toBeGreaterThan(0)
    const next = screen.getByRole('region', { name: 'Learnable at 145' })
    expect(within(next).getByText('Elixir of Wisdom')).toBeTruthy()
    expect(within(next).getAllByText('req. 145').length).toBe(2)
    const known = screen.getByRole('region', { name: 'Known' })
    expect(within(known).getByText('Minor Healing Potion')).toBeTruthy()
  })

  it('difficulty has a shape and a tooltip with the ranges', () => {
    openThrall('Alchemy')
    const next = screen.getByRole('region', { name: 'Learnable at 145' })
    const glyph = within(next).getAllByTestId('difficulty')[0]
    expect(glyph.textContent).toBe('▲')
    expect(glyph.getAttribute('title')).toBe('orange < 175 ≤ yellow < 195 ≤ green < 215 ≤ gray')
  })

  it('marks the selected recipe', () => {
    openThrall('Alchemy')
    fireEvent.click(screen.getByText('Minor Healing Potion'))
    const row = screen.getByText('Minor Healing Potion').closest('button')!
    expect(row.getAttribute('aria-current')).toBe('true')
  })

  it('opens materials across characters with stale bank', () => {
    openThrall('Alchemy')
    fireEvent.click(screen.getByText('Minor Healing Potion'))
    const panel = screen.getByRole('region', { name: 'Materials' })
    expect(within(panel).getByText('Can craft 3× · limited by Earthroot')).toBeTruthy()
    expect(within(panel).getByText('Peacebloom')).toBeTruthy()
    expect(within(panel).getByText('Need 1 · Have 32')).toBeTruthy()
    const stale = panel.querySelector('.stale')
    expect(stale?.textContent).toContain('Thrall · Bank 8 · seen 4 days ago')
    expect(within(panel).getByText(/Jaina · Bags 3 · seen today/)).toBeTruthy()
    expect(within(panel).getByText(/Account bank · 20 · seen today/)).toBeTruthy()
  })

  it('warns about banks that were never scanned', () => {
    openThrall('Alchemy')
    fireEvent.click(screen.getByText('Minor Healing Potion'))
    expect(screen.getByText("Jaina's bank isn't scanned. Open it in game, then /reload.")).toBeTruthy()
  })

  it('quantity scales needed amounts', () => {
    openThrall('Alchemy')
    fireEvent.click(screen.getByText('Minor Healing Potion'))
    fireEvent.change(screen.getByLabelText('Craft ×'), { target: { value: '5' } })
    expect(screen.getByText('Need 5 · Have 3')).toBeTruthy()
  })

  it('cannot craft → names the missing reagent', () => {
    openThrall('Alchemy')
    fireEvent.click(screen.getByText('Elixir of Wisdom'))
    expect(screen.getByText('Can craft – missing Bruiseweed')).toBeTruthy()
  })

  it('known recipes missing from the database', () => {
    const s = fixtureSnapshot()
    s.characters[1].professions[0].knownRecipes!.push({ name: 'Mystery Brew', reagents: [] })
    render(withData(<ProfessionsView snapshot={s} now={FIXTURE_NOW} />))
    fireEvent.click(screen.getByRole('button', { name: /Thrall/ }))
    const region = screen.getByRole('region', { name: 'Known, not in database' })
    expect(within(region).getByText('Mystery Brew')).toBeTruthy()
  })

  it('gathering profession shows only skill', () => {
    openThrall('Herbalism')
    expect(screen.getAllByText('160/225').length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'Known' })).toBeNull()
  })

  it('unscanned crafting profession asks to open the window', () => {
    const s = fixtureSnapshot()
    const thrall = s.characters.find((c) => c.name === 'Thrall')!
    delete thrall.professions.find((p) => p.name === 'Alchemy')!.knownRecipes
    render(withData(<ProfessionsView snapshot={s} now={FIXTURE_NOW} />))
    fireEvent.click(screen.getByRole('button', { name: /Thrall/ }))
    fireEvent.click(screen.getByRole('button', { name: /Alchemy/ }))
    expect(screen.getByText('Open the profession window in game and type /reload.')).toBeTruthy()
  })

  it('character without professions', () => {
    render(withData(<ProfessionsView snapshot={fixtureSnapshot()} now={FIXTURE_NOW} />))
    fireEvent.click(screen.getByRole('button', { name: /Jaina/ }))
    expect(screen.getByText('This character has no professions yet.')).toBeTruthy()
  })

  it('empty snapshot', () => {
    render(withData(<ProfessionsView snapshot={{ schemaVersion: 2, characters: [], itemNames: {} }} now={FIXTURE_NOW} />))
    expect(screen.getByText('No characters yet – log in and type /reload.')).toBeTruthy()
  })
})
