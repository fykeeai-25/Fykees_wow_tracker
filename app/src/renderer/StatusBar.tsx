import type { DataState, LoadState } from '../shared/types'
import { statusText } from '../shared/status'

export function StatusBar({ load, now, data }: { load: LoadState; now: number; data?: DataState }) {
  const bad = load.status === 'error' || (load.status === 'ok' && load.warning)
  const failed = data?.lastCheck && !data.lastCheck.ok
  return (
    <footer className={`status ${bad ? 'warn' : ''}`}>
      <span>{statusText(load, now)}</span>
      {data && (
        <span
          className="data-version"
          title={failed ? `Data update check failed: ${data.lastCheck!.error}` : undefined}
        >{`Data v${data.pack.manifest.dataVersion}`}</span>
      )}
    </footer>
  )
}
