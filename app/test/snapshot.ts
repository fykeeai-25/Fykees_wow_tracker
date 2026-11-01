import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSavedVariables } from '../src/main/luaParser'
import { normalize } from '../src/main/normalizer'
import type { ProfessionData, TrackerSnapshot } from '../src/shared/types'
import alchemyJson from '../../data/professions/alchemy.json'

export const FIXTURE_NOW = 1761980000

export function fixtureSnapshot(): TrackerSnapshot {
  return normalize(parseSavedVariables(readFileSync(join(__dirname, 'fixtures/AzerothTracker.lua'), 'utf8')))
}

export const alchemy = alchemyJson as unknown as ProfessionData
