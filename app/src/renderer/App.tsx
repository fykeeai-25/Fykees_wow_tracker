import { useEffect, useState } from 'react'
import type { AppState, DataState } from '../shared/types'
import { DataProvider } from './DataContext'
import { modules } from './modules'
import { SetupScreen } from './SetupScreen'
import { StatusBar } from './StatusBar'

const nowSeconds = () => Math.floor(Date.now() / 1000)

export function App() {
  const [state, setState] = useState<AppState>()
  const [data, setData] = useState<DataState>()
  const [now, setNow] = useState(nowSeconds)
  const [moduleId, setModuleId] = useState(modules[0].id)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    window.azeroth.getState().then(setState)
    const off = window.azeroth.onState(setState)
    window.azeroth.getData().then(setData)
    const offData = window.azeroth.onData(setData)
    const timer = setInterval(() => setNow(nowSeconds()), 30_000)
    return () => {
      off()
      offData()
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
    <DataProvider value={data}>
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
        <button className="gear" aria-label="Settings" onClick={() => setShowSettings((v) => !v)}>
          ⚙
        </button>
      </header>
      {showSettings && (
        <div className="settings">
          <div>
            <span className="muted">Game folder</span> <code>{state.gameDir}</code>
          </div>
          <div>
            <span className="muted">Account</span> <code>{state.account}</code>
          </div>
          <button onClick={() => window.azeroth.chooseGameDir()}>Change folder</button>
          <button onClick={() => window.azeroth.setAccount('')}>Change account</button>
        </div>
      )}
      <main>
        {state.load.status === 'ok' ? (
          <active.Component snapshot={state.load.snapshot} now={now} />
        ) : (
          <div className="hint">
            <p>No addon data yet.</p>
            <p className="muted">
              Copy the addon to <code>{`${state.gameDir}\\Interface\\AddOns\\AzerothTracker`}</code>, log in and type{' '}
              <code>/reload</code>.
            </p>
          </div>
        )}
      </main>
      <StatusBar load={state.load} now={now} data={data} />
    </div>
    </DataProvider>
  )
}
