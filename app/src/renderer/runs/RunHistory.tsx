import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Character, Run, TrackerSnapshot } from '../../shared/types'
import { dungeonNames, durationText, filterRuns, runDuration, runRows, runTotals, type RunRow } from '../../shared/runs'
import { agoText } from '../../shared/status'
import { itemName } from '../../shared/materials'
import { wowheadItemUrl } from '../../shared/wowhead'
import { useGameData } from '../DataContext'
import { useSidePanel } from '../SidePanel'
import { Money } from '../Money'
import { WowheadLink } from '../professions/WowheadLink'

interface Props {
  character: Character
  snapshot: TrackerSnapshot
  now: number
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`
const xpText = (n: number): string => n.toLocaleString('en-US')
const runKey = (r: RunRow): string => `${r.characterKey}/${r.run.startedAt}`

/** Quick view for the Run history bubble. */
export function RunsSummary({ character, now }: Props) {
  const all = character.runs ?? []
  const open = all.find((r) => r.inProgress)
  const runs = all.filter((r) => !r.inProgress)
  if (all.length === 0) return <p className="muted">No runs yet – enter a dungeon, then /reload after leaving it.</p>
  const last = runs.length > 0 ? runs.reduce((a, b) => (b.startedAt > a.startedAt ? b : a)) : undefined
  return (
    <div className="runs-summary">
      {open && (
        <p className="run-live">{`In progress: ${open.dungeon} · ${open.bosses.length} ${open.bosses.length === 1 ? 'boss' : 'bosses'} · ${durationText(runDuration(open))} so far`}</p>
      )}
      <p>{plural(runs.length, 'run')}</p>
      {last && (
        <p className="muted">{`Last: ${last.dungeon} · ${durationText(runDuration(last))} · ${agoText(Math.max(0, now - last.endedAt))}`}</p>
      )}
    </div>
  )
}

function RunDetail({ row, snapshot }: { row: RunRow; snapshot: TrackerSnapshot }) {
  const game = useGameData()
  const r: Run = row.run
  return (
    <section className="run-detail" aria-label="Run details">
      <header>
        <h3>{r.dungeon}</h3>
        {r.inProgress ? (
          <span className="run-badge live">In progress</span>
        ) : (
          r.completed && <span className="run-badge">Completed</span>
        )}
      </header>
      <dl>
        <dt>Character</dt>
        <dd>{r.level !== undefined ? `${row.characterName} (level ${r.level})` : row.characterName}</dd>
        {r.difficulty && (
          <>
            <dt>Difficulty</dt>
            <dd>{r.difficulty}</dd>
          </>
        )}
        <dt>Duration</dt>
        <dd>{`${durationText(runDuration(r))}${r.inProgress ? ' so far' : ''}`}</dd>
        <dt>XP</dt>
        <dd>{xpText(r.xp)}</dd>
        <dt>Gold</dt>
        <dd>
          {r.money < 0 && '−'}
          <Money copper={Math.abs(r.money)} />
        </dd>
        <dt>Deaths</dt>
        <dd>{r.deaths}</dd>
      </dl>
      <h4>Bosses killed</h4>
      {r.bosses.length > 0 ? (
        <ul className="run-bosses">
          {r.bosses.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">None</p>
      )}
      <h4>Loot</h4>
      {r.loot.length > 0 ? (
        <ul className="run-loot">
          {r.loot.map((l) => {
            const name = itemName(l.itemId, snapshot, game.items)
            return (
              <li key={l.itemId}>
                <span>{`${name} ×${l.count}`}</span>
                <WowheadLink url={wowheadItemUrl(l.itemId)} label={name} />
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="muted">Nothing new in the bags</p>
      )}
    </section>
  )
}

/** Full Run history view: filters, totals, the run list and one run's details. */
export function RunsDetail({ character, snapshot, now }: Props) {
  const all = runRows(snapshot)
  const [dungeon, setDungeon] = useState('')
  const [characterKey, setCharacterKey] = useState(character.key)
  const [selected, setSelected] = useState<string>()
  const side = useSidePanel()

  const rows = filterRuns(all, { dungeon, characterKey })
  const totals = runTotals(rows)
  const open = rows.find((r) => runKey(r) === selected)
  const detail = open && <RunDetail key={runKey(open)} row={open} snapshot={snapshot} />

  return (
    <div className="runs">
      <div className="run-filters">
        <label>
          Dungeon
          <select value={dungeon} onChange={(e) => setDungeon(e.target.value)}>
            <option value="">All dungeons</option>
            {dungeonNames(all).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Character
          <select value={characterKey} onChange={(e) => setCharacterKey(e.target.value)}>
            <option value="">All characters</option>
            {snapshot.characters.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={side ? 'runs-body no-side' : 'runs-body'}>
        <div>
          {totals.count > 0 && (
            <p className="muted run-totals">
              {`${plural(totals.count, 'run')} · ${xpText(totals.xp)} XP · avg ${durationText(totals.avgDuration)} · ${plural(totals.deaths, 'death')}`}
            </p>
          )}
          {rows.length === 0 ? (
            <p className="hint">{all.length === 0 ? 'No runs yet – enter a dungeon, then /reload after leaving it.' : 'No runs match the filter.'}</p>
          ) : (
            <ul className="run-list" aria-label="Runs">
              {rows.map((r) => (
                <li key={runKey(r)}>
                  <button
                    className="run-row"
                    aria-current={runKey(r) === selected ? 'true' : undefined}
                    onClick={() => setSelected(runKey(r))}
                  >
                    <span className="run-dungeon">{r.run.dungeon}</span>
                    {r.run.inProgress && <span className="run-badge live">In progress</span>}
                    {!characterKey && <span className="run-char">{r.characterName}</span>}
                    <span className="muted">{durationText(runDuration(r.run))}</span>
                    <span className="muted" title="Deaths">{`☠ ${r.run.deaths}`}</span>
                    <span className="muted">{`${xpText(r.run.xp)} XP`}</span>
                    <Money copper={Math.max(0, r.run.money)} />
                    <span className="muted run-ago">{agoText(Math.max(0, now - r.run.endedAt))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!side && detail}
      </div>
      {side && detail && createPortal(detail, side)}
    </div>
  )
}
