// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import type { ReactElement } from 'react'
import { AltsView } from './AltsView'
import { DataProvider } from '../DataContext'
import { fixtureSnapshot, samplePack, FIXTURE_NOW } from '../../../test/snapshot'
import type { TrackerSnapshot } from '../../shared/types'

afterEach(cleanup)

const withData = (ui: ReactElement) => <DataProvider value={{ pack: samplePack(), source: 'bundled' }}>{ui}</DataProvider>
const show = (s: TrackerSnapshot = fixtureSnapshot()) => render(withData(<AltsView snapshot={s} now={FIXTURE_NOW} />))

describe('AltsView search', () => {
  it('finds an item across characters', () => {
    show()
    fireEvent.change(screen.getByLabelText('Find item'), { target: { value: 'bloom' } })
    const results = screen.getByRole('region', { name: 'Search results' })
    expect(within(results).getByText('Peacebloom')).toBeTruthy()
    expect(within(results).getByText('32')).toBeTruthy()
    expect(within(results).getByText(/Thrall · Bank 8 · seen 4 days ago/)).toBeTruthy()
    expect(within(results).getByRole('button', { name: 'Open Peacebloom on Wowhead' })).toBeTruthy()
  })

  it('says when nothing matches', () => {
    show()
    fireEvent.change(screen.getByLabelText('Find item'), { target: { value: 'zzz' } })
    expect(screen.getByText('No item matching "zzz".')).toBeTruthy()
  })
})

describe('AltsView characters table', () => {
  it('shows gold, currencies and the total', () => {
    show()
    const table = screen.getByRole('table', { name: 'Characters' })
    expect(within(table).getByRole('columnheader', { name: "Merchant's Favor" })).toBeTruthy()
    const thrall = within(table).getByRole('row', { name: /Thrall/ })
    expect(thrall.textContent).toContain('12g 34s 56c')
    expect(within(thrall).getByText('7')).toBeTruthy()
    const jaina = within(table).getByRole('row', { name: /Jaina/ })
    expect(jaina.textContent).toContain('50s')
    expect(within(jaina).getByText('–')).toBeTruthy()
    const total = within(table).getByRole('row', { name: /Total/ })
    expect(total.textContent).toContain('12g 84s 56c')
    expect(within(total).getByText('7')).toBeTruthy()
  })

  it('a character without money shows – and does not change the total', () => {
    const s = fixtureSnapshot()
    s.characters.push({ ...s.characters[0], key: 'Firemaw-Brakk', name: 'Brakk', money: undefined, currencies: undefined })
    show(s)
    const table = screen.getByRole('table', { name: 'Characters' })
    const brakk = within(table).getByRole('row', { name: /Brakk/ })
    expect(within(brakk).getAllByText('–').length).toBe(2)
    expect(within(table).getByRole('row', { name: /Total/ }).textContent).toContain('12g 84s 56c')
  })

  it('zero copper shows 0c', () => {
    const s = fixtureSnapshot()
    s.characters[0].money = 0
    show(s)
    const jaina = within(screen.getByRole('table', { name: 'Characters' })).getByRole('row', { name: /Jaina/ })
    expect(jaina.textContent).toContain('0c')
  })
})
