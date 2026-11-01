import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSavedVariables } from '../src/main/luaParser'
import { normalize } from '../src/main/normalizer'
import type { DataPack, ProfessionData, TrackerSnapshot } from '../src/shared/types'
import { buildPack } from '../scripts/data-pack.mjs'

export const FIXTURE_NOW = 1761980000

export function fixtureSnapshot(): TrackerSnapshot {
  return normalize(parseSavedVariables(readFileSync(join(__dirname, 'fixtures/AzerothTracker.lua'), 'utf8')))
}

export function samplePack(dataVersion = 1): DataPack {
  return buildPack(join(__dirname, '../../data'), dataVersion, new Date('2026-11-01T12:00:00Z'))
}

export const alchemy: ProfessionData = samplePack().professions.find((p) => p.profession === 'Alchemy')!
export const sampleItems: Record<string, string> = samplePack().items
