import type { AppState } from '../shared/types'

export interface SetupScreenProps {
  state: AppState
  onChooseDir(): void
  onSelectAccount(account: string): void
}

const REASON: Record<'missing-dir' | 'missing-wtf' | 'no-accounts', string> = {
  'missing-dir': 'Složka neexistuje.',
  'missing-wtf': 'Ve složce chybí WTF – vyber složku, kde jsou Interface a WTF.',
  'no-accounts': 'Ve složce WTF/Account není žádný účet – přihlas se jednou do hry.'
}

export function SetupScreen({ state, onChooseDir, onSelectAccount }: SetupScreenProps) {
  return (
    <div className="setup">
      <h1>AzerothTracker</h1>
      {state.phase === 'needs-account' ? (
        <>
          <p>Ve složce je víc WoW účtů. Vyber, který chceš sledovat:</p>
          <div className="accounts">
            {state.accounts.map((a) => (
              <button key={a} onClick={() => onSelectAccount(a)}>
                {a}
              </button>
            ))}
          </div>
          <p className="muted">{state.gameDir}</p>
          <button className="link" onClick={onChooseDir}>
            Změnit složku
          </button>
        </>
      ) : (
        <>
          <p>
            Vyber složku hry – tu, ve které jsou <code>Interface</code> a <code>WTF</code> (např.{' '}
            <code>D:\Hry\World of Warcraft\_forever_</code>).
          </p>
          {state.phase === 'needs-game-dir' && state.reason && <p className="error">{REASON[state.reason]}</p>}
          <button className="primary" onClick={onChooseDir}>
            Vybrat složku hry
          </button>
        </>
      )}
    </div>
  )
}
