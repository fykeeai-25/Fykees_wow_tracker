import type { DataState, LoadState } from '../shared/types'
import { isOld, statusText } from '../shared/status'

/** Data freshness and game-data version, shown in the top bar. */
export function StatusBar({ load, now, data, demo }: { load: LoadState; now: number; data?: DataState; demo?: boolean }) {
  const bad = load.status === 'error' || (load.status === 'ok' && load.warning)
  const failed = data?.lastCheck && !data.lastCheck.ok
  return (
    <div className={`status ${bad ? 'warn' : ''} ${isOld(load, now) ? 'old' : ''}`}>
      <span>{`${demo ? 'Demo data · ' : ''}${statusText(load, now)}`}</span>
      {data && (
        <span className="data-version" title={failed ? `Data update check failed: ${data.lastCheck!.error}` : undefined}>
          {`Data v${data.pack.manifest.dataVersion}`}
        </span>
      )}
    </div>
  )
}
