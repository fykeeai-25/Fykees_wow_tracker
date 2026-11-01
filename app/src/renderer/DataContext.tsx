import type { ReactNode } from 'react'
import type { DataPack, DataState, ProfessionData } from '../shared/types'

export function DataProvider(props: { value: DataState | undefined; children: ReactNode }) {
  return <>{props.children}</>
}

export function useGameData(): {
  pack?: DataPack
  items: Record<string, string>
  professionData(name: string): ProfessionData | undefined
} {
  return { items: {}, professionData: () => undefined }
}
