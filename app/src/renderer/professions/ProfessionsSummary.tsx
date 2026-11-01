import type { Character, TrackerSnapshot } from '../../shared/types'
import { classifyRecipes } from '../../shared/professions'
import { useGameData } from '../DataContext'

/** Quick view for the Professions bubble: skill per profession and what can be learned. */
export function ProfessionsSummary({ character }: { character: Character; snapshot: TrackerSnapshot; now: number }) {
  const game = useGameData()
  if (character.professions.length === 0) return <p className="muted">No professions yet.</p>
  return (
    <ul className="prof-summary">
      {character.professions.map((p) => {
        const data = game.professionData(p.name)
        const c = data ? classifyRecipes(p, data) : undefined
        const nextAt = c?.availableNext[0]?.recipe.learnAt
        return (
          <li key={p.name}>
            <span className="prof-name">{`${p.name} ${p.skill}/${p.maxSkill}`}</span>
            <progress className="skill-bar" max={p.maxSkill || 1} value={p.skill} aria-hidden />
            {c && (
              <span className="muted prof-next">
                {`${c.availableNow.length} learnable now${nextAt !== undefined ? ` · next at ${nextAt}` : ''}`}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
