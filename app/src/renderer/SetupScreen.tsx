import type { AppState } from '../shared/types'

export interface SetupScreenProps {
  state: AppState
  onChooseDir(): void
  onSelectAccount(account: string): void
}

const REASON: Record<'missing-dir' | 'missing-wtf' | 'no-accounts', string> = {
  'missing-dir': 'This folder does not exist.',
  'missing-wtf': 'This folder has no WTF folder – pick the folder that contains Interface and WTF.',
  'no-accounts': 'There is no account in WTF/Account – log in to the game once.'
}

export function SetupScreen({ state, onChooseDir, onSelectAccount }: SetupScreenProps) {
  return (
    <div className="setup">
      <h1>AzerothTracker</h1>
      {state.phase === 'needs-account' ? (
        <>
          <p>This folder has several WoW accounts. Pick the one to track:</p>
          <div className="accounts">
            {state.accounts.map((a) => (
              <button key={a} onClick={() => onSelectAccount(a)}>
                {a}
              </button>
            ))}
          </div>
          <p className="muted">{state.gameDir}</p>
          <button className="link" onClick={onChooseDir}>
            Change folder
          </button>
        </>
      ) : (
        <>
          <p>
            Choose your game folder – the one that contains <code>Interface</code> and <code>WTF</code> (e.g.{' '}
            <code>D:\Games\World of Warcraft\_forever_</code>).
          </p>
          {state.phase === 'needs-game-dir' && state.reason && <p className="error">{REASON[state.reason]}</p>}
          <button className="primary" onClick={onChooseDir}>
            Choose game folder
          </button>
        </>
      )}
    </div>
  )
}
