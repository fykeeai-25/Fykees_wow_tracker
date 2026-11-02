// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import { ItemSearch as Search } from './ItemSearch'
import type { ReactElement } from 'react'
import { ItemSearch } from './ItemSearch'
import { DataProvider } from './DataContext'
import { fixtureSnapshot, samplePack, FIXTURE_NOW } from '../../test/snapshot'
import type { TrackerSnapshot } from '../shared/types'

afterEach(cleanup)

const withData = (ui: ReactElement) => <DataProvider value={{ pack: samplePack(), source: 'bundled' }}>{ui}</DataProvider>
const show = (s: TrackerSnapshot = fixtureSnapshot()) => render(withData(<ItemSearch snapshot={s} now={FIXTURE_NOW} />))

describe('ItemSearch', () => {
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


describe('ItemSearch polish', () => {
  it('Escape does not wipe the query (plain text field) and Clear search empties it', () => {
    render(withData(<Search snapshot={fixtureSnapshot()} now={FIXTURE_NOW} />))
    const input = screen.getByLabelText('Find item') as HTMLInputElement
    expect(input.type).toBe('text')
    fireEvent.change(input, { target: { value: 'bloom' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(input.value).toBe('')
  })

  it('says when results are capped', () => {
    render(withData(<Search snapshot={fixtureSnapshot()} now={FIXTURE_NOW} limit={1} />))
    fireEvent.change(screen.getByLabelText('Find item'), { target: { value: 'oo' } })
    expect(screen.getByText('Showing 1 of 2 – type more to narrow it down.')).toBeTruthy()
  })
})
