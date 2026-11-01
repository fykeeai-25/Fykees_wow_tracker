import type { FC } from 'react'
import type { TrackerSnapshot } from '../shared/types'
import { ProfessionsView } from './professions/ProfessionsView'
import { AltsView } from './alts/AltsView'

export interface ModuleDef {
  id: string
  label: string
  Component: FC<{ snapshot: TrackerSnapshot; now: number }>
}

export const modules: ModuleDef[] = [
  { id: 'professions', label: 'Professions', Component: ProfessionsView },
  { id: 'alts', label: 'Alts', Component: AltsView }
]
