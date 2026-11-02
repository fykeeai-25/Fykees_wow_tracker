import { useState, type Ref } from 'react'
import type { TrackerSnapshot } from '../shared/types'
import { searchItemsWithTotal } from '../shared/alts'
import { wowheadItemUrl } from '../shared/wowhead'
import { useGameData } from './DataContext'
import { sourceLabel } from './professions/format'
import { WowheadLink } from './professions/WowheadLink'

/** "Where is my item?" – search across all characters' bags and banks. */
export function ItemSearch({ snapshot, now, inputRef, limit = 50 }: { snapshot: TrackerSnapshot; now: number; inputRef?: Ref<HTMLInputElement>; limit?: number }) {
  const [query, setQuery] = useState('')
  const game = useGameData()
  const { hits, total } = searchItemsWithTotal(query, snapshot, game.items, now, limit)
  const searching = query.trim().length >= 2
  return (
    <section className="item-search">
      <div className="search-box">
        {/* plain text field: type="search" would clear itself on Escape */}
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          aria-label="Find item"
          placeholder="Find item…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
            ×
          </button>
        )}
      </div>
      {searching && (
        <div className="search-results" role="region" aria-label="Search results">
          {hits.length === 0 && <p className="muted">{`No item matching "${query.trim()}".`}</p>}
          {total > hits.length && <p className="muted">{`Showing ${hits.length} of ${total} – type more to narrow it down.`}</p>}
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
