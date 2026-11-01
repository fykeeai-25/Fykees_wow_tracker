import type { ProfessionData } from '../shared/types'

// Static game data from <repo>/data/professions, bundled at build time.
const files = import.meta.glob('../../../data/professions/*.json', { eager: true, import: 'default' }) as Record<
  string,
  ProfessionData
>

const byName = new Map(Object.values(files).map((d) => [d.profession, d]))

export function getProfessionData(name: string): ProfessionData | undefined {
  return byName.get(name)
}
