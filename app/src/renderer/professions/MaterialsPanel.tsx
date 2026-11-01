import { useState } from 'react'
import type { Reagent, TrackerSnapshot } from '../../shared/types'
import { canCraft, materialAvailability, unscannedBanks } from '../../shared/materials'
import { wowheadItemUrl } from '../../shared/wowhead'
import { sourceLabel } from './format'
import { WowheadLink } from './WowheadLink'


export interface MaterialsPanelProps {
  recipeName: string
  reagents: Reagent[]
  snapshot: TrackerSnapshot
  items: Record<string, string>
  now: number
}

export function MaterialsPanel({ recipeName, reagents, snapshot, items, now }: MaterialsPanelProps) {
  const [qty, setQty] = useState(1)
  const rows = materialAvailability(reagents, snapshot, items, now, qty)
  const craft = canCraft(rows)
  const unscanned = unscannedBanks(snapshot)
  return (
    <section className="materials" aria-label="Materials">
      <header>
        <h3>{recipeName}</h3>
        <label>
          Craft ×
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </label>
      </header>
      {rows.length === 0 ? (
        <p className="muted">This recipe needs no materials.</p>
      ) : (
        <p className={`craftable ${craft.count > 0 ? 'yes' : 'no'}`}>
          {craft.count > 0 ? `Can craft ${craft.count}× · limited by ${craft.limitedBy}` : `Can craft – missing ${craft.missing}`}
        </p>
      )}
      {rows.map((row) => (
        <div key={row.itemId} className={`material ${row.enough ? 'enough' : 'missing'}`}>
          <div className="material-head">
            <span className="mark" aria-hidden>
              {row.enough ? '✓' : '✗'}
            </span>
            <span className="material-name">{row.name}</span>
            <WowheadLink url={wowheadItemUrl(row.itemId)} label={row.name} />
            <span className="count">{`Need ${row.needed} · Have ${row.total}`}</span>
          </div>
          <ul>
            {row.sources.map((s, i) => (
              <li key={i} className={s.stale ? 'stale' : undefined} title={s.stale ? 'May be outdated' : undefined}>
                {s.stale && (
                  <span className="clock" aria-hidden>
                    🕒{' '}
                  </span>
                )}
                {sourceLabel(s, now)}
              </li>
            ))}
            {row.sources.length === 0 && <li className="muted">Not found anywhere</li>}
          </ul>
        </div>
      ))}
      {unscanned.length === 1 && (
        <p className="muted unscanned">{`${unscanned[0].characterName}'s bank isn't scanned. Open it in game, then /reload.`}</p>
      )}
      {unscanned.length > 1 && (
        <p className="muted unscanned">{`Banks not scanned yet: ${unscanned.map((u) => u.characterName).join(', ')}. Open them in game, then /reload.`}</p>
      )}
    </section>
  )
}
