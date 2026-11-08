// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import type { ReactElement } from 'react'
import { RunsDetail, RunsSummary } from './RunHistory'
import { DataProvider } from '../DataContext'
import { SidePanelProvider } from '../SidePanel'
import { fixtureSnapshot, samplePack, FIXTURE_NOW } from '../../../test/snapshot'

afterEach(cleanup)

const withData = (ui: ReactElement) => <DataProvider value={{ pack: samplePack(), source: 'bundled' }}>{ui}</DataProvider>
const char = (name: string) => fixtureSnapshot().characters.find((c) => c.name === name)!

function detail(name = 'Thrall') {
  const s = fixtureSnapshot()
  return render(withData(<RunsDetail character={s.characters.find((c) => c.name === name)!} snapshot={s} now={FIXTURE_NOW} />))
}

const rows = () => within(screen.getByRole('list', { name: 'Runs' })).getAllByRole('button')

describe('Run history', () => {
  it('summary shows the number of runs and the last one', () => {
    const s = fixtureSnapshot()
    render(withData(<RunsSummary character={char('Thrall')} snapshot={s} now={FIXTURE_NOW} />))
    expect(screen.getByText('2 runs')).toBeTruthy()
    expect(screen.getByText('Last: The Deadmines · 25 min · 2 h ago')).toBeTruthy()
  })

  it('summary without runs explains how to get one', () => {
    const s = fixtureSnapshot()
    const c = { ...char('Thrall'), runs: undefined }
    render(withData(<RunsSummary character={c} snapshot={s} now={FIXTURE_NOW} />))
    expect(screen.getByText('No runs yet – enter a dungeon, then /reload after leaving it.')).toBeTruthy()
  })

  it("lists this character's runs newest first with totals", () => {
    detail()
    expect(rows().map((r) => r.querySelector('.run-dungeon')!.textContent)).toEqual(['The Deadmines', 'Wailing Caverns'])
    expect(screen.getByText('2 runs · 10,300 XP · avg 35 min · 1 death')).toBeTruthy()
  })

  it('filters by dungeon', () => {
    detail()
    fireEvent.change(screen.getByLabelText('Dungeon'), { target: { value: 'Wailing Caverns' } })
    expect(rows()).toHaveLength(1)
    expect(screen.getByText('1 run · 6,100 XP · avg 45 min · 0 deaths')).toBeTruthy()
  })

  it('all characters shows whose run it was', () => {
    detail()
    fireEvent.change(screen.getByLabelText('Character'), { target: { value: '' } })
    expect(rows()).toHaveLength(3)
    expect(rows()[2].textContent).toContain('Jaina')
  })

  it('opens a run with bosses, loot, XP, gold and deaths', () => {
    detail()
    fireEvent.click(rows()[0])
    const panel = screen.getByRole('region', { name: 'Run details' })
    expect(within(panel).getByText('The Deadmines')).toBeTruthy()
    expect(within(panel).getByText("Rhahk'Zor")).toBeTruthy()
    expect(within(panel).getByText('Edwin VanCleef')).toBeTruthy()
    expect(within(panel).getByText("Thief's Blade ×1")).toBeTruthy()
    expect(within(panel).getByText('Peacebloom ×3')).toBeTruthy()
    expect(within(panel).getByText('4,200')).toBeTruthy()
    expect(within(panel).getByText('1')).toBeTruthy()
    expect(within(panel).getByText('Completed')).toBeTruthy()
    expect(rows()[0].getAttribute('aria-current')).toBe('true')
  })

  it('run details go to the side panel when the layout has one', () => {
    const side = document.createElement('div')
    document.body.appendChild(side)
    const s = fixtureSnapshot()
    const { container } = render(
      withData(
        <SidePanelProvider value={side}>
          <RunsDetail character={s.characters.find((c) => c.name === 'Thrall')!} snapshot={s} now={FIXTURE_NOW} />
        </SidePanelProvider>
      )
    )
    fireEvent.click(rows()[0])
    expect(within(side).getByRole('region', { name: 'Run details' })).toBeTruthy()
    expect(container.querySelector('.run-detail')).toBeNull()
    side.remove()
  })

  it('a character without runs gets a hint', () => {
    detail('Jaina')
    fireEvent.change(screen.getByLabelText('Dungeon'), { target: { value: 'Wailing Caverns' } })
    expect(screen.getByText('No runs match the filter.')).toBeTruthy()
  })
  describe('run in progress', () => {
    const withActive = () => {
      const s = fixtureSnapshot()
      const thrall = s.characters.find((c) => c.name === 'Thrall')!
      thrall.runs!.push({
        dungeon: 'City of Dalaran', startedAt: FIXTURE_NOW - 1800, endedAt: FIXTURE_NOW - 60, level: 24,
        xp: 1200, money: 5000, deaths: 2, bosses: ['Atrexis the Grave Knight'], loot: [], inProgress: true
      })
      return { s, thrall }
    }

    it('the summary shows it', () => {
      const { s, thrall } = withActive()
      render(withData(<RunsSummary character={thrall} snapshot={s} now={FIXTURE_NOW} />))
      expect(screen.getByText('In progress: City of Dalaran · 1 boss · 29 min so far')).toBeTruthy()
      expect(screen.getByText('2 runs')).toBeTruthy()
    })

    it('it is listed first, marked, and left out of the totals', () => {
      const { s, thrall } = withActive()
      render(withData(<RunsDetail character={thrall} snapshot={s} now={FIXTURE_NOW} />))
      const first = rows()[0]
      expect(first.querySelector('.run-dungeon')!.textContent).toBe('City of Dalaran')
      expect(first.textContent).toContain('In progress')
      expect(screen.getByText('2 runs · 10,300 XP · avg 35 min · 1 death')).toBeTruthy()
      fireEvent.click(first)
      const panel = screen.getByRole('region', { name: 'Run details' })
      expect(within(panel).getByText('In progress')).toBeTruthy()
      expect(within(panel).getByText('29 min so far')).toBeTruthy()
      expect(within(panel).queryByText('Completed')).toBeNull()
    })
  })
})
