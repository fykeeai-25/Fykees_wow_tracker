import { useState } from 'react'
import type { KnownRecipe, Profession, ProfessionData, StaticRecipe, TrackerSnapshot } from '../../shared/types'
import { classifyRecipes, type Difficulty, type RecipeView } from '../../shared/professions'
import { wowheadItemUrl, wowheadSpellUrl } from '../../shared/wowhead'
import { useGameData } from '../DataContext'
import { classColor, className } from '../classColors'
import { MaterialsPanel } from './MaterialsPanel'
import { sourceText } from './format'
import { WowheadLink } from './WowheadLink'

interface Selected {
  name: string
  reagents: KnownRecipe['reagents']
}

const GLYPH: Record<Difficulty, string> = { orange: '▲', yellow: '●', green: '○', gray: '–' }

const rangeTitle = (r: StaticRecipe): string =>
  `orange < ${r.skillRange.yellow} ≤ yellow < ${r.skillRange.green} ≤ green < ${r.skillRange.gray} ≤ gray`

const recipeUrl = (r: { spellId?: number; createdItemId?: number }): string | undefined =>
  r.spellId !== undefined ? wowheadSpellUrl(r.spellId) : r.createdItemId !== undefined ? wowheadItemUrl(r.createdItemId) : undefined

function RecipeList(props: { title: string; items: RecipeView[]; selected?: string; onSelect(s: Selected): void }) {
  if (props.items.length === 0) return null
  return (
    <section className="recipes" aria-label={props.title}>
      <h3>{props.title}</h3>
      <ul>
        {props.items.map(({ recipe, difficulty }) => (
          <li key={recipe.spellId ?? recipe.name} className="recipe-row">
            <button
              className="recipe"
              aria-current={props.selected === recipe.name ? 'true' : undefined}
              onClick={() => props.onSelect({ name: recipe.name, reagents: recipe.reagents })}
            >
              <span data-testid="difficulty" className={`diff ${difficulty}`} title={rangeTitle(recipe)}>
                {GLYPH[difficulty]}
              </span>
              <span>{recipe.name}</span>
              <span className="muted req">{`req. ${recipe.learnAt}`}</span>
              <span className="muted source">{sourceText(recipe)}</span>
            </button>
            <WowheadLink url={recipeUrl(recipe)} label={recipe.name} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Legend() {
  return (
    <p className="legend muted">
      <span className="diff orange">▲</span> always · <span className="diff yellow">●</span> likely ·{' '}
      <span className="diff green">○</span> rarely · <span className="diff gray">–</span> never gives a skill-up
    </p>
  )
}

function ProfessionDetail(props: { profession: Profession; snapshot: TrackerSnapshot; now: number }) {
  const { profession: p } = props
  const [selected, setSelected] = useState<Selected>()
  const game = useGameData()
  const data: ProfessionData | undefined = game.professionData(p.name)
  const header = (
    <header className="profession-head">
      <h2>{p.name}</h2>
      <span className="skill">{`${p.skill}/${p.maxSkill}`}</span>
      <progress className="skill-bar" max={p.maxSkill || 1} value={p.skill} aria-hidden />
    </header>
  )
  if (!data && p.knownRecipes === undefined) return <div className="profession">{header}</div>

  const c = classifyRecipes(p, data ?? { profession: p.name, recipes: [] })
  const nextAt = c.availableNext[0]?.recipe.learnAt
  return (
    <div className="profession">
      {header}
      <div className="profession-body">
        <div className="recipe-columns">
          {c.scanned ? (
            <RecipeList title="Known" items={c.known} selected={selected?.name} onSelect={setSelected} />
          ) : (
            <p className="hint">Open the profession window in game and type /reload.</p>
          )}
          <RecipeList title="Learnable now" items={c.availableNow} selected={selected?.name} onSelect={setSelected} />
          {nextAt !== undefined && (
            <RecipeList title={`Learnable at ${nextAt}`} items={c.availableNext} selected={selected?.name} onSelect={setSelected} />
          )}
          {c.unknownKnown.length > 0 && (
            <section className="recipes" aria-label="Known, not in database">
              <h3>Known, not in database</h3>
              <ul>
                {c.unknownKnown.map((r) => (
                  <li key={r.spellId ?? r.name} className="recipe-row">
                    <button
                      className="recipe"
                      aria-current={selected?.name === r.name ? 'true' : undefined}
                      onClick={() => setSelected(r)}
                    >
                      <span className="diff unknown" aria-hidden>
                        ?
                      </span>
                      <span>{r.name}</span>
                      <span className="muted source">no data</span>
                    </button>
                    <WowheadLink url={recipeUrl(r)} label={r.name} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Legend />
        </div>
        {selected && (
          <MaterialsPanel
            key={selected.name}
            recipeName={selected.name}
            reagents={selected.reagents}
            snapshot={props.snapshot}
            items={game.items}
            now={props.now}
          />
        )}
      </div>
    </div>
  )
}

export function ProfessionsView({ snapshot, now }: { snapshot: TrackerSnapshot; now: number }) {
  const [charKey, setCharKey] = useState(snapshot.characters[0]?.key)
  const [profName, setProfName] = useState<string>()

  if (snapshot.characters.length === 0) {
    return <p className="hint">No characters yet – log in and type /reload.</p>
  }
  const character = snapshot.characters.find((c) => c.key === charKey) ?? snapshot.characters[0]
  const profession = character.professions.find((p) => p.name === profName) ?? character.professions[0]

  return (
    <div className="professions">
      <nav className="characters" aria-label="Characters">
        {snapshot.characters.map((c) => (
          <button
            key={c.key}
            className={c.key === character.key ? 'active' : undefined}
            onClick={() => {
              setCharKey(c.key)
              setProfName(undefined)
            }}
          >
            <span className="char-name" style={{ color: classColor(c.className) }}>
              {c.name}
            </span>
            <span className="char-line muted">{`Lv ${c.level} ${className(c.className)} · ${c.realm}`}</span>
          </button>
        ))}
      </nav>
      <div className="character-detail">
        {character.professions.length === 0 ? (
          <p className="hint">This character has no professions yet.</p>
        ) : (
          <>
            <div className="profession-tabs">
              {character.professions.map((p) => (
                <button
                  key={p.name}
                  aria-pressed={p.name === profession.name}
                  className={p.name === profession.name ? 'active' : undefined}
                  onClick={() => setProfName(p.name)}
                >
                  {p.name} <span className="muted">{`${p.skill}/${p.maxSkill}`}</span>
                </button>
              ))}
            </div>
            <ProfessionDetail key={`${character.key}/${profession.name}`} profession={profession} snapshot={snapshot} now={now} />
          </>
        )}
      </div>
    </div>
  )
}
