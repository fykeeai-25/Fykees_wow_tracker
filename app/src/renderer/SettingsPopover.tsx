import { useEffect, useRef, useState } from 'react'

export interface SettingsPopoverProps {
  gameDir: string
  account: string
  onClose(): void
  diagnostics?: import('../shared/types').Diagnostics
}

export function SettingsPopover({ gameDir, account, onClose, diagnostics }: SettingsPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [onTop, setOnTop] = useState(false)

  useEffect(() => {
    window.azeroth.getWindowPrefs().then((p) => setOnTop(p.alwaysOnTop))
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  return (
    <div ref={ref} className="popover" role="dialog" aria-label="Settings">
      <dl>
        <dt>Game folder</dt>
        <dd>{gameDir}</dd>
        <dt>Account</dt>
        <dd>{account}</dd>
        <dt>Game client</dt>
        <dd>
          {diagnostics ? (
            <>
              <div>{`${diagnostics.build} (interface ${diagnostics.interface}) · addon ${diagnostics.addonVersion}`}</div>
              {diagnostics.missing.length === 0 ? (
                <div className="ok-text">All APIs the addon needs are available.</div>
              ) : (
                <div className="error">{`Missing in this client: ${diagnostics.missing.join(', ')}`}</div>
              )}
            </>
          ) : (
            <span className="muted">Game client: log in with the addon and type /reload.</span>
          )}
        </dd>
      </dl>
      <div className="popover-actions">
        <button onClick={() => window.azeroth.chooseGameDir()}>Change folder</button>
        <button onClick={() => window.azeroth.setAccount('')}>Change account</button>
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={onTop}
          onChange={(e) => {
            setOnTop(e.target.checked)
            void window.azeroth.setAlwaysOnTop(e.target.checked)
          }}
        />
        Always on top
      </label>
    </div>
  )
}
