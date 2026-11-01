import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { DataPack, DataState, ProfessionData } from '../shared/types'

const Ctx = createContext<DataState | undefined>(undefined)

export function DataProvider(props: { value: DataState | undefined; children: ReactNode }) {
  return <Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>
}

export interface GameData {
  pack?: DataPack
  items: Record<string, string>
  professionData(name: string): ProfessionData | undefined
}

export function useGameData(): GameData {
  const state = useContext(Ctx)
  return useMemo(() => {
    const pack = state?.pack
    const byName = new Map((pack?.professions ?? []).map((p) => [p.profession, p]))
    return { pack, items: pack?.items ?? {}, professionData: (name) => byName.get(name) }
  }, [state])
}
