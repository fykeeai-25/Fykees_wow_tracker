import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState, DataState } from '../shared/types'
import { DataProvider } from './DataContext'
import { SetupScreen } from './SetupScreen'
import { StatusBar } from './StatusBar'
import { SettingsPopover } from './SettingsPopover'
import { CharacterList } from './CharacterList'
import { Dashboard } from './Dashboard'
import { ItemSearch } from './ItemSearch'

const nowSeconds = () => Math.floor(Date.now() / 1000)

export function App() {
  const [state, setState] = useState<AppState>()
  const [data, setData] = useState<DataState>()
  const [now, setNow] = useState(nowSeconds)
  const [selectedKey, setSelectedKey] = useState<string>()
  const [showSettings, setShowSettings] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSettings = useCallback(() => setShowSettings(false), [])
  const searchInput = useRef<HTMLInputElement>(null)
  const searchToggle = useRef<HTMLButtonElement>(null)
  const searchOpenRef = useRef(false)

  // Focus the search field when the panel opens (narrow windows).
  useEffect(() => {
    searchOpenRef.current = searchOpen
    if (searchOpen) searchInput.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    window.azeroth.getState().then(setState)
    const off = window.azeroth.onState(setState)
    window.azeroth.getData().then(setData)
    const offData = window.azeroth.onData(setData)
    const timer = setInterval(() => setNow(nowSeconds()), 30_000)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && searchOpenRef.current) {
        setSearchOpen(false)
        searchToggle.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      off()
      offData()
      clearInterval(timer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!state) return null
  if (state.phase !== 'ready') {
    return (
      <SetupScreen
        state={state}
        onChooseDir={() => window.azeroth.chooseGameDir()}
        onSelectAccount={(a) => window.azeroth.setAccount(a)}
        onUseDemo={() => window.azeroth.useDemo()}
      />
    )
  }

  const snapshot = state.load.status === 'ok' ? state.load.snapshot : undefined
  const character = snapshot && (snapshot.characters.find((c) => c.key === selectedKey) ?? snapshot.characters[0])

  return (
    <DataProvider value={data}>
      <div className="app">
        <header className="topbar">
          <span className="brand">AzerothTracker</span>
          <StatusBar load={state.load} now={now} data={data} demo={state.demo} />
          <button
            ref={searchToggle}
            className="search-toggle"
            aria-label="Toggle search"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            🔍
          </button>
          <button
            className="gear"
            aria-label="Settings"
            aria-expanded={showSettings}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setShowSettings((v) => !v)}
          >
            ⚙
          </button>
        </header>
        {showSettings && (
          <SettingsPopover gameDir={state.gameDir} account={state.account} onClose={closeSettings} diagnostics={snapshot?.diagnostics} />
        )}
        {snapshot ? (
          <div className={`layout ${searchOpen ? 'search-open' : ''}`}>
            <CharacterList snapshot={snapshot} now={now} selectedKey={character?.key} onSelect={setSelectedKey} />
            <main className="center">
              {character ? (
                <Dashboard character={character} snapshot={snapshot} now={now} />
              ) : (
                <p className="hint">No characters yet – log in and type /reload.</p>
              )}
            </main>
            <aside className="search-column" aria-label="Search">
              <ItemSearch snapshot={snapshot} now={now} inputRef={searchInput} />
            </aside>
          </div>
        ) : (
          <main className="center">
            <div className="hint">
              <p>No addon data yet.</p>
              <p className="muted">
                Copy the addon to <code>{`${state.gameDir}\\Interface\\AddOns\\AzerothTracker`}</code>, log in and type{' '}
                <code>/reload</code>.
              </p>
            </div>
          </main>
        )}
      </div>
    </DataProvider>
  )
}
