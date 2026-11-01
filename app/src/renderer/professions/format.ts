import type { StaticRecipe } from '../../shared/types'

const SOURCE_LABEL: Record<StaticRecipe['source']['type'], string> = {
  trainer: 'Trainer',
  vendor: 'Vendor',
  drop: 'Drop',
  quest: 'Quest',
  unknown: 'Unknown source'
}

export function money(copper: number): string {
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = copper % 100
  return [g && `${g}g`, s && `${s}s`, (c || (!g && !s)) && `${c}c`].filter(Boolean).join(' ')
}

export function sourceText(r: StaticRecipe): string {
  const label = SOURCE_LABEL[r.source.type]
  return r.source.cost ? `${label} · ${money(r.source.cost)}` : label
}

export function ageText(seenAt: number, now: number): string {
  const days = Math.floor((now - seenAt) / 86400)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
