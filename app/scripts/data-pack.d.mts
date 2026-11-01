import type { DataPack, ProfessionData } from '../src/shared/types'

export const DATA_SCHEMA: number
export function validateData(data: { items: Record<string, string>; professions: ProfessionData[] }): string[]
export function buildPack(dataDir: string, dataVersion: number, now?: Date): DataPack
