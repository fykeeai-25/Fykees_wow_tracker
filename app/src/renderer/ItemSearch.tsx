import { useState } from 'react'
import type { TrackerSnapshot } from '../shared/types'
import { searchItems } from '../shared/alts'
import { wowheadItemUrl } from '../shared/wowhead'
import { useGameData } from './DataContext'
import { sourceLabel } from './professions/format'
import { WowheadLink } from './professions/WowheadLink'

/** "Where is my item?" – search across all characters' bags and banks. */
export function ItemSearch({ snapshot, now }: { snapshot: TrackerSnapshot; now: number }) {
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
