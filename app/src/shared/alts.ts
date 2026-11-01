import type { Container, TrackerSnapshot } from './types'
import { itemName, itemSources, type MaterialSource } from './materials'

export interface ItemHit {
  itemId: number
  name: string
  total: number
  sources: MaterialSource[]
}

function ownedItemIds(snapshot: TrackerSnapshot): Set<number> {
  const ids = new Set<number>()
  const containers = [snapshot.accountBank, ...snapshot.characters.flatMap((c) => [c.bags, c.bank])].filter(
    (c): c is Container => c !== undefined
  )
  for (const c of containers) {
    for (const [id, count] of Object.entries(c.items)) if (count > 0) ids.add(Number(id))
  }
  return ids
}

/** "Where is this item?" – owned items whose name contains the query (case-insensitive). */
export function searchItems(
  query: string,
  snapshot: TrackerSnapshot,
  items: Record<string, string> | undefined,
  now: number,
  limit = 50
): ItemHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const hits: ItemHit[] = []
  for (const id of ownedItemIds(snapshot)) {
    const name = itemName(id, snapshot, items)
    if (!name.toLowerCase().includes(q)) continue
    const sources = itemSources(id, snapshot, now)
    hits.push({ itemId: id, name, total: sources.reduce((n, s) => n + s.count, 0), sources })
  }
  return hits.sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit)
}

/** Currency names that at least one character has, sorted. */
export function currencyColumns(snapshot: TrackerSnapshot): string[] {
  const names = new Set<string>()
  for (const c of snapshot.characters) for (const n of Object.keys(c.currencies ?? {})) names.add(n)
  return [...names].sort((a, b) => a.localeCompare(b))
}

/** Sum of gold and of each currency over all characters that have the data. */
export function totals(snapshot: TrackerSnapshot): { money: number; currencies: Record<string, number> } {
  let money = 0
  const currencies: Record<string, number> = {}
  for (const c of snapshot.characters) {
    money += c.money ?? 0
    for (const [n, v] of Object.entries(c.currencies ?? {})) currencies[n] = (currencies[n] ?? 0) + v
  }
  return { money, currencies }
}
