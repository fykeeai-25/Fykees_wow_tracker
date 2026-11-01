import { useEffect, useState } from 'react'
import type { AppState } from '../shared/types'
import { modules } from './modules'
import { SetupScreen } from './SetupScreen'
import { StatusBar } from './StatusBar'

const nowSeconds = () => Math.floor(Date.now() / 1000)

export function App() {
  const [state, setState] = useState<AppState>()
  const [now, setNow] = useState(nowSeconds)
  const [moduleId, setModuleId] = useState(modules[0].id)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    window.azeroth.getState().then(setState)
    const off = window.azeroth.onState(setState)
    const timer = setInterval(() => setNow(nowSeconds()), 30_000)
    return () => {
      off()
      clearInterval(timer)
    }
  }, [])

  if (!state) return null
  if (state.phase !== 'ready') {
    return (
      <SetupScreen
        state={state}
        onChooseDir={() => window.azeroth.chooseGameDir()}
        onSelectAccount={(a) => window.azeroth.setAccount(a)}
      />
    )
  }

  const active = modules.find((m) => m.id === moduleId) ?? modules[0]
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">AzerothTracker</span>
        <nav className="tabs">
          {modules.map((m) => (
            <button key={m.id} className={m.id === active.id ? 'active' : undefined} onClick={() => setModuleId(m.id)}>
              {m.label}
            </button>
          ))}
        </nav>
        <button className="gear" aria-label="Nastavení" onClick={() => setShowSettings((v) => !v)}>
          ⚙
        </button>
      </header>
      {showSettings && (
        <div className="settings">
          <div>
            <span className="muted">Složka hry</span> <code>{state.gameDir}</code>
          </div>
          <div>
            <span className="muted">Účet</span> <code>{state.account}</code>
          </div>
          <button onClick={() => window.azeroth.chooseGameDir()}>Změnit složku</button>
          <button onClick={() => window.azeroth.setAccount('')}>Změnit účet</button>
        </div>
      )}
      <main>
        {state.load.status === 'ok' ? (
          <active.Component snapshot={state.load.snapshot} now={now} />
        ) : (
          <div className="hint">
            <p>Data addonu zatím nejsou k dispozici.</p>
            <p className="muted">
              Zkopíruj addon do <code>{`${state.gameDir}\\Interface\\AddOns\\AzerothTracker`}</code>, přihlas se a dej{' '}
              <code>/reload</code>.
            </p>
          </div>
        )}
      </main>
      <StatusBar load={state.load} now={now} />
    </div>
  )
}
