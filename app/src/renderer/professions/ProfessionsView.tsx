import { useState } from 'react'
import type { KnownRecipe, Profession, ProfessionData, TrackerSnapshot } from '../../shared/types'
import { classifyRecipes, type RecipeView } from '../../shared/professions'
import { getProfessionData } from '../staticData'
import { MaterialsPanel } from './MaterialsPanel'
import { sourceText } from './format'

interface Selected {
  name: string
  reagents: KnownRecipe['reagents']
}

function RecipeList(props: { title: string; items: RecipeView[]; onSelect(s: Selected): void }) {
  if (props.items.length === 0) return null
  return (
    <section className="recipes" aria-label={props.title}>
      <h3>{props.title}</h3>
      <ul>
        {props.items.map(({ recipe, difficulty }) => (
          <li key={recipe.name}>
            <button className="recipe" onClick={() => props.onSelect({ name: recipe.name, reagents: recipe.reagents })}>
              <span className={`dot ${difficulty}`} aria-hidden />
              <span>{recipe.name}</span>
              <span className="muted">{sourceText(recipe)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ProfessionDetail(props: { profession: Profession; snapshot: TrackerSnapshot; now: number }) {
  const { profession: p } = props
  const [selected, setSelected] = useState<Selected>()
  const data: ProfessionData | undefined = getProfessionData(p.name)
  const header = (
    <header className="profession-head">
      <h2>{p.name}</h2>
      <span className="skill">{`${p.skill}/${p.maxSkill}`}</span>
    </header>
  )
  if (!data && p.knownRecipes === undefined) return <div className="profession">{header}</div>

  const c = classifyRecipes(p, data ?? { profession: p.name, items: {}, recipes: [] })
  return (
    <div className="profession">
      {header}
      <div className="profession-body">
        <div className="recipe-columns">
          {c.scanned ? (
            <RecipeList title="Umím" items={c.known} onSelect={setSelected} />
          ) : (
            <p className="hint">Otevři okno profese ve hře a dej /reload.</p>
          )}
          <RecipeList title="Můžu se naučit teď" items={c.availableNow} onSelect={setSelected} />
          <RecipeList title="Po dalším skillupu" items={c.availableNext} onSelect={setSelected} />
          {c.unknownKnown.length > 0 && (
            <section className="recipes" aria-label="Neznámé recepty">
              <h3>Neznámé recepty</h3>
              <ul>
                {c.unknownKnown.map((r) => (
                  <li key={r.name}>
                    <button className="recipe" onClick={() => setSelected(r)}>
                      <span className="dot unknown" aria-hidden />
                      <span>{r.name}</span>
                      <span className="muted">neznámý</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {selected && (
          <MaterialsPanel
            key={selected.name}
            recipeName={selected.name}
            reagents={selected.reagents}
            snapshot={props.snapshot}
            data={data}
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
    return <p className="hint">Zatím žádné postavy – přihlas se a dej /reload.</p>
  }
  const character = snapshot.characters.find((c) => c.key === charKey) ?? snapshot.characters[0]
  const profession = character.professions.find((p) => p.name === profName) ?? character.professions[0]

  return (
    <div className="professions">
      <nav className="characters" aria-label="Postavy">
        {snapshot.characters.map((c) => (
          <button
            key={c.key}
            className={c.key === character.key ? 'active' : undefined}
            onClick={() => {
              setCharKey(c.key)
              setProfName(undefined)
            }}
          >
            <strong>{c.name}</strong> <span className="muted">{`${c.level} ${c.className.toLowerCase()} · ${c.realm}`}</span>
          </button>
        ))}
      </nav>
      <div className="character-detail">
        {character.professions.length === 0 ? (
          <p className="hint">Tahle postava zatím nemá žádnou profesi.</p>
        ) : (
          <>
            <div className="profession-tabs">
              {character.professions.map((p) => (
                <button
                  key={p.name}
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
