import { useState } from 'react'
import type { Character, TrackerSnapshot } from '../shared/types'
import { bubbles } from './modules'

/** Centre column: bubble summaries; a click opens one bubble's full view. */
export function Dashboard({ character, snapshot, now }: { character: Character; snapshot: TrackerSnapshot; now: number }) {
  const [openId, setOpenId] = useState<string>()
  const open = bubbles.find((b) => b.id === openId)
  if (open) {
    return (
      <div className="dashboard full">
        <div className="full-head">
          <button className="back" onClick={() => setOpenId(undefined)}>
            ← Back
          </button>
          <h2>{`${character.name} · ${open.title}`}</h2>
        </div>
        <open.Detail character={character} snapshot={snapshot} now={now} />
      </div>
    )
  }
  return (
    <div className="dashboard">
      {bubbles.map((b) => (
        <button key={b.id} className="bubble" onClick={() => setOpenId(b.id)}>
          <span className="bubble-title">{b.title}</span>
          <b.Summary character={character} snapshot={snapshot} now={now} />
        </button>
      ))}
    </div>
  )
}
