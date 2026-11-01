import { useState } from 'react'
import type { TrackerSnapshot } from '../../shared/types'
import { currencyColumns, searchItems, totals } from '../../shared/alts'
import { agoText } from '../../shared/status'
import { wowheadItemUrl } from '../../shared/wowhead'
import { useGameData } from '../DataContext'
import { ClassIcon } from '../ClassIcon'
import { classColor } from '../classColors'
import { Money } from '../Money'
import { sourceLabel } from '../professions/format'
import { WowheadLink } from '../professions/WowheadLink'

function ItemSearch({ snapshot, now }: { snapshot: TrackerSnapshot; now: number }) {
  const [query, setQuery] = useState('')
  const game = useGameData()
  const hits = searchItems(query, snapshot, game.items, now)
  const searching = query.trim().length >= 2
  return (
    <section className="item-search">
      <input
        type="search"
        className="search-input"
        aria-label="Find item"
        placeholder="Find item…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && (
        <div className="search-results" role="region" aria-label="Search results">
          {hits.length === 0 && <p className="muted">{`No item matching "${query.trim()}".`}</p>}
          {hits.map((h) => (
            <div key={h.itemId} className="hit">
              <div className="hit-head">
                <span className="hit-name">{h.name}</span>
                <WowheadLink url={wowheadItemUrl(h.itemId)} label={h.name} />
                <span className="hit-total">{h.total}</span>
              </div>
              <ul>
                {h.sources.map((s, i) => (
                  <li key={i} className={s.stale ? 'stale' : undefined} title={s.stale ? 'May be outdated' : undefined}>
                    {s.stale && (
                      <span className="clock" aria-hidden>
                        🕒{' '}
                      </span>
                    )}
                    {sourceLabel(s, now)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CharactersTable({ snapshot, now }: { snapshot: TrackerSnapshot; now: number }) {
  const currencies = currencyColumns(snapshot)
  const sum = totals(snapshot)
  return (
    <table className="alts-table" aria-label="Characters">
      <thead>
        <tr>
          <th>Character</th>
          <th className="num">Gold</th>
          {currencies.map((c) => (
            <th key={c} className="num">
              {c}
            </th>
          ))}
          <th className="num">Last seen</th>
        </tr>
      </thead>
      <tbody>
        {snapshot.characters.map((c) => (
          <tr key={c.key}>
            <td>
              <span className="alt-char">
                <ClassIcon token={c.className} size={24} />
                <span className="char-name" style={{ color: classColor(c.className) }}>
                  {c.name}
                </span>
                <span className="muted">{`Lv ${c.level}`}</span>
              </span>
            </td>
            <td className="num">{c.money === undefined ? '–' : <Money copper={c.money} />}</td>
            {currencies.map((n) => (
              <td key={n} className="num">
                {c.currencies?.[n] === undefined ? '–' : String(c.currencies[n])}
              </td>
            ))}
            <td className="num muted">{agoText(Math.max(0, now - c.updatedAt))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td className="num">
            <Money copper={sum.money} />
          </td>
          {currencies.map((n) => (
            <td key={n} className="num">
              {String(sum.currencies[n] ?? 0)}
            </td>
          ))}
          <td />
        </tr>
      </tfoot>
    </table>
  )
}

export function AltsView({ snapshot, now }: { snapshot: TrackerSnapshot; now: number }) {
  if (snapshot.characters.length === 0) return <p className="hint">No characters yet – log in and type /reload.</p>
  return (
    <div className="alts">
      <ItemSearch snapshot={snapshot} now={now} />
      <CharactersTable snapshot={snapshot} now={now} />
    </div>
  )
}
