import { useState } from 'react'
import type { ProfessionData, Reagent, TrackerSnapshot } from '../../shared/types'
import { materialAvailability, unscannedBanks, type MaterialSource } from '../../shared/materials'
import { ageText } from './format'

const CONTAINER_LABEL: Record<MaterialSource['container'], string> = {
  bags: 'bags',
  bank: 'bank',
  accountBank: 'Account bank'
}

function sourceLabel(s: MaterialSource): string {
  return s.container === 'accountBank'
    ? `${CONTAINER_LABEL.accountBank} ${s.count}`
    : `${s.characterName} – ${CONTAINER_LABEL[s.container]} ${s.count}`
}

export interface MaterialsPanelProps {
  recipeName: string
  reagents: Reagent[]
  snapshot: TrackerSnapshot
  data?: ProfessionData
  now: number
}

export function MaterialsPanel({ recipeName, reagents, snapshot, data, now }: MaterialsPanelProps) {
  const [qty, setQty] = useState(1)
  const rows = materialAvailability(reagents, snapshot, data, now, qty)
  const unscanned = unscannedBanks(snapshot)
  return (
    <section className="materials" aria-label="Materials">
      <header>
        <h3>{recipeName}</h3>
        <label>
          Quantity
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
      </header>
      {rows.length === 0 && <p className="muted">This recipe needs no materials.</p>}
      {rows.map((row) => (
        <div key={row.itemId} className={`material ${row.enough ? 'enough' : 'missing'}`}>
          <div className="material-head">
            <span>{row.name}</span>
            <span className="count">{`${row.needed} / ${row.total}`}</span>
          </div>
          <ul>
            {row.sources.map((s, i) => (
              <li key={i} className={s.stale ? 'stale' : undefined} title={s.stale ? 'May be outdated' : undefined}>
                {`${sourceLabel(s)} (${ageText(s.seenAt, now)})`}
              </li>
            ))}
            {row.sources.length === 0 && <li className="muted">Not found anywhere</li>}
          </ul>
        </div>
      ))}
      {unscanned.length > 0 && (
        <p className="muted unscanned">{`Bank not scanned yet: ${unscanned.map((u) => u.characterName).join(', ')}`}</p>
      )}
    </section>
  )
}
