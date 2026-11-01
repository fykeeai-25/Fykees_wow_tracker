// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
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

