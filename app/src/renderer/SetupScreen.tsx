import type { AppState } from '../shared/types'

export interface SetupScreenProps {
  state: AppState
  onChooseDir(): void
  onSelectAccount(account: string): void
  onUseDemo?(): void
}

const REASON: Record<'missing-dir' | 'missing-wtf' | 'no-accounts', string> = {
  'missing-dir': 'This folder does not exist.',
  'missing-wtf': "That isn't the game folder. Pick the one with Interface and WTF, usually …\\_forever_.",
  'no-accounts': 'No WoW account found in WTF/Account. Log in to the game once, then try again.'
}

export function SetupScreen({ state, onChooseDir, onSelectAccount }: SetupScreenProps) {
  return (
    <div className="setup">
      <h1>AzerothTracker</h1>
      {state.phase === 'needs-account' ? (
        <>
          <p>Several accounts found. Which one should AzerothTracker follow?</p>
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
