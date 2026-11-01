import type { TrackerSnapshot } from '../shared/types'

export interface CharacterListProps {
  snapshot: TrackerSnapshot
  now: number
  selectedKey?: string
  onSelect(key: string): void
}

export function CharacterList(_props: CharacterListProps) {
  return null
}
