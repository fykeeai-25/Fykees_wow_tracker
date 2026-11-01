import type { Container, Reagent, TrackerSnapshot } from './types'

export const STALE_AFTER_SECONDS = 259200

export interface MaterialSource {
  container: 'bags' | 'bank' | 'accountBank'
  characterKey?: string
  characterName?: string
  count: number
  seenAt: number
  stale: boolean
}

export interface MaterialRow {
  itemId: number
  name: string
  /** amount for one craft */
  perCraft: number
  needed: number
  total: number
  enough: boolean
  sources: MaterialSource[]
}

/** Name from the game data pack, then from what the addon saw, then a placeholder. */
export function itemName(id: number, snapshot: TrackerSnapshot, items?: Record<string, string>): string {
  return items?.[String(id)] ?? snapshot.itemNames[id] ?? `Item #${id}`
}

/** How many crafts the owned materials allow, and which reagent limits it. */
export function canCraft(rows: MaterialRow[]): { count: number; limitedBy?: string; missing?: string } {
  if (rows.length === 0) return { count: 0 }
  let min = Infinity
  let limitedBy: string | undefined
  for (const r of rows) {
    const n = Math.floor(r.total / r.perCraft)
    if (n < min) {
      min = n
      limitedBy = r.name
    }
  }
  if (min > 0) return { count: min, limitedBy }
  return { count: 0, missing: rows.find((r) => r.total < r.perCraft)?.name }
}

export function materialAvailability(
  reagents: Reagent[],
  snapshot: TrackerSnapshot,
  items: Record<string, string> | undefined,
  now: number,
  multiplier = 1
): MaterialRow[] {
  return reagents.map((r) => {
    const sources: MaterialSource[] = []
    const add = (c: Container | undefined, src: Omit<MaterialSource, 'count' | 'seenAt' | 'stale'>): void => {
      const count = c?.items[r.itemId] ?? 0
      if (!c || count <= 0) return
      sources.push({ ...src, count, seenAt: c.seenAt, stale: now - c.seenAt > STALE_AFTER_SECONDS })
    }
    for (const ch of snapshot.characters) {
      const who = { characterKey: ch.key, characterName: ch.name }
      add(ch.bags, { container: 'bags', ...who })
      add(ch.bank, { container: 'bank', ...who })
    }
    add(snapshot.accountBank, { container: 'accountBank' })

    const needed = r.count * multiplier
    const total = sources.reduce((sum, s) => sum + s.count, 0)
    return { itemId: r.itemId, name: itemName(r.itemId, snapshot, items), perCraft: r.count, needed, total, enough: total >= needed, sources }
  })
}

/** Characters whose bank the addon has never seen (their bank contents are unknown). */
export function unscannedBanks(snapshot: TrackerSnapshot): { characterKey: string; characterName: string }[] {
  return snapshot.characters.filter((c) => !c.bank).map((c) => ({ characterKey: c.key, characterName: c.name }))
}
