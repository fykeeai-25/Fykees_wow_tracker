import { useEffect, useState } from 'react'
import type { AppState } from '../shared/types'

// Temporary state dump; replaced by the real UI in Task 7.
export function App() {
  const [state, setState] = useState<AppState>()
  useEffect(() => {
    window.azeroth.getState().then(setState)
    return window.azeroth.onState(setState)
  }, [])
  return (
    <div>
      <h1>AzerothTracker</h1>
      <button onClick={() => window.azeroth.chooseGameDir()}>Vybrat složku hry</button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}
