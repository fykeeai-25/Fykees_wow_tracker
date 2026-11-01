import type { LoadState } from '../shared/types'
import { statusText } from '../shared/status'

export function StatusBar({ load, now }: { load: LoadState; now: number }) {
  const bad = load.status === 'error' || (load.status === 'ok' && load.warning)
  return <footer className={`status ${bad ? 'warn' : ''}`}>{statusText(load, now)}</footer>
}
