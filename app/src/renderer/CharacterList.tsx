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

const currencyText = (cur: Record<string, number> | undefined): string =>
  Object.entries(cur ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([n, v]) => `${abbreviateCurrency(n)} ${v}`)
    .join(' · ')

export function CharacterList({ snapshot, now, selectedKey, onSelect }: CharacterListProps) {
  const sum = totals(snapshot)
  const sumCur = currencyText(sum.currencies)
  return (
    <aside className="char-column" aria-label="Characters">
      <div className="column-title">Characters</div>
      <div className="char-rows">
        {snapshot.characters.map((c) => {
          const cur = currencyText(c.currencies)
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
                  {cur && ` · ${cur}`}
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
        {sumCur && <span>{sumCur}</span>}
      </div>
    </aside>
  )
}
