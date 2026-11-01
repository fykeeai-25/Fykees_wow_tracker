import type { LoadState } from './types'

function parts(unixSeconds: number, tz?: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const out: Record<string, string> = {}
  for (const p of fmt.formatToParts(new Date(unixSeconds * 1000))) out[p.type] = p.value
  return out
}

export function statusText(load: LoadState, now: number, tz?: string): string {
  if (load.status === 'missing') return 'Zatím žádná data – nainstaluj addon, přihlas se a dej /reload.'
  if (load.status === 'error') return `Chyba načítání: ${load.message}`

  const t = parts(load.fileUpdatedAt, tz)
  const n = parts(now, tz)
  const time = `${t.hour}:${t.minute}`
  const sameDay = t.year === n.year && t.month === n.month && t.day === n.day
  const text = sameDay ? `Data z /reload v ${time}` : `Data z /reload ${Number(t.day)}. ${Number(t.month)}. v ${time}`
  return load.warning ? `${text} – ${load.warning}` : text
}
