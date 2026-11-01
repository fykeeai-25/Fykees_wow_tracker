import type { ProfessionData, Reagent, TrackerSnapshot } from './types'

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
  needed: number
  total: number
  enough: boolean
  sources: MaterialSource[]
}

export function itemName(_id: number, _snapshot: TrackerSnapshot, _data?: ProfessionData): string {
  throw new Error('not implemented')
}

export function materialAvailability(
  _reagents: Reagent[],
  _snapshot: TrackerSnapshot,
  _data: ProfessionData | undefined,
  _now: number,
  _multiplier = 1
): MaterialRow[] {
  throw new Error('not implemented')
}
