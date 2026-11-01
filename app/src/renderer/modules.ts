import type { FC } from 'react'
import type { Character, TrackerSnapshot } from '../shared/types'
import { ProfessionsDetail } from './professions/ProfessionsView'
import { ProfessionsSummary } from './professions/ProfessionsSummary'
import { AltsView } from './alts/AltsView'


export interface BubbleProps {
  character: Character
  snapshot: TrackerSnapshot
  now: number
}

export interface BubbleDef {
  id: string
  title: string
  Summary: FC<BubbleProps>
  Detail: FC<BubbleProps>
}

/** Dashboard bubbles, in display order. New modules (Legacy planner…) are added here. */
export const bubbles: BubbleDef[] = [
  { id: 'professions', title: 'Professions', Summary: ProfessionsSummary, Detail: ProfessionsDetail }
]
