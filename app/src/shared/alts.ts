import type { TrackerSnapshot } from './types'
import type { MaterialSource } from './materials'

export interface ItemHit {
  itemId: number
  name: string
  total: number
  sources: MaterialSource[]
}

export function searchItems(
  _query: string,
  _snapshot: TrackerSnapshot,
  _items: Record<string, string> | undefined,
  _now: number,
  _limit = 50
): ItemHit[] {
  throw new Error('not implemented')
}

export function currencyColumns(_snapshot: TrackerSnapshot): string[] {
  throw new Error('not implemented')
}

export function totals(_snapshot: TrackerSnapshot): { money: number; currencies: Record<string, number> } {
  throw new Error('not implemented')
}
