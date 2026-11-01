import type { LoadState } from './types'

export const OLD_AFTER_SECONDS = 1800

function clock(unixSeconds: number, tz?: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(unixSeconds * 1000)
  )
}

export function agoText(seconds: number): string {
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

/** The last /reload is older than 30 minutes. */
export function isOld(load: LoadState, now: number): boolean {
  return load.status === 'ok' && now - load.fileUpdatedAt > OLD_AFTER_SECONDS
}

export function statusText(load: LoadState, now: number, tz?: string): string {
  if (load.status === 'missing') return 'No data yet – install the addon, log in and type /reload.'
  if (load.status === 'error') return `Load error: ${load.message}`
  const age = agoText(Math.max(0, now - load.fileUpdatedAt))
  const text = isOld(load, now) ? `Last /reload ${age}` : `Updated ${clock(load.fileUpdatedAt, tz)} · ${age}`
  return load.warning ? `${text} – ${load.warning}` : text
}
