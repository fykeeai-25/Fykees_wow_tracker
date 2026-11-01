import type { TrackerSnapshot } from '../shared/types'
import { totals } from '../shared/alts'
import { abbreviateCurrency } from '../shared/currency'
import { agoText } from '../shared/status'
import { ClassIcon } from './ClassIcon'
import { classColor } from './classColors'
import { Money } from './Money'

export interface CharacterListProps {
  snapshot: TrackerSnapshot
  now: number
  selectedKey?: string
  onSelect(key: string): void
}

/** Short currency labels (MF 7 · HP 3) with the full name as a tooltip. */
function Currencies({ values }: { values: Record<string, number> | undefined }) {
  const entries = Object.entries(values ?? {}).sort(([a], [b]) => a.localeCompare(b))
  return (
    <>
      {entries.map(([n, v]) => (
        <span key={n}>
          {' · '}
          <span title={n}>{`${abbreviateCurrency(n)} ${v}`}</span>
        </span>
      ))}
    </>
  )
}

export function CharacterList({ snapshot, now, selectedKey, onSelect }: CharacterListProps) {
  const sum = totals(snapshot)
  return (
    <aside className="char-column" aria-label="Characters">
      <div className="column-title">Characters</div>
      <div className="char-rows">
        {snapshot.characters.map((c) => {
          return (
            <button
              key={c.key}
              className="char-row"
              aria-current={c.key === selectedKey ? 'true' : undefined}
              onClick={() => onSelect(c.key)}
            >
              <ClassIcon token={c.className} size={34} />
              <span className="char-text">
                <span className="char-name" style={{ color: classColor(c.className) }}>
                  {c.name}
                </span>
                <span className="char-info">
                  {`Lv ${c.level}`}
                  {c.money !== undefined && (
                    <>
                      {' · '}
                      <Money copper={c.money} />
                    </>
                  )}
                  <Currencies values={c.currencies} />
                </span>
                <span className="char-seen">{`seen ${agoText(Math.max(0, now - c.updatedAt))}`}</span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="char-total" role="contentinfo" aria-label="Total">
        <span>Total</span>
        <Money copper={sum.money} />
        {Object.entries(sum.currencies)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([n, v]) => (
            <span key={n} title={n}>{`${abbreviateCurrency(n)} ${v}`}</span>
          ))}
      </div>
    </aside>
  )
}
