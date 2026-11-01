// Validates the static game data in <repo>/data and bundles it into one data pack:
// { manifest: { dataSchema, dataVersion, generatedAt }, items, professions }.
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export const DATA_SCHEMA = 1
const SOURCE_TYPES = new Set(['trainer', 'vendor', 'drop', 'quest', 'unknown'])

/** Returns a list of problems; an empty list means the data is valid. */
export function validateData({ items, professions }) {
  const errors = []
  const seenSpells = new Set()
  const needName = (id, where) => {
    if (typeof items[String(id)] !== 'string') errors.push(`missing item name ${id} (in ${where})`)
  }
  for (const prof of professions) {
    for (const r of prof.recipes ?? []) {
      const { yellow, green, gray } = r.skillRange ?? {}
      if (!(r.learnAt <= yellow && yellow <= green && green <= gray)) {
        errors.push(`skill ranges out of order in ${r.name}`)
      }
      if (!SOURCE_TYPES.has(r.source?.type)) errors.push(`unknown source type "${r.source?.type}" in ${r.name}`)
      for (const g of r.reagents ?? []) needName(g.itemId, r.name)
      if (r.createdItemId !== undefined) needName(r.createdItemId, r.name)
      if (r.spellId !== undefined) {
        if (seenSpells.has(r.spellId)) errors.push(`duplicate spellId ${r.spellId}`)
        seenSpells.add(r.spellId)
      }
    }
  }
  return errors
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

/** Reads data/items.json + data/professions/*.json, validates, and returns the pack. */
export function buildPack(dataDir, dataVersion, now = new Date()) {
  const items = readJson(join(dataDir, 'items.json')).items
  const profDir = join(dataDir, 'professions')
  const professions = readdirSync(profDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const { profession, recipes } = readJson(join(profDir, f))
      return { profession, recipes }
    })
  const errors = validateData({ items, professions })
  if (errors.length) throw new Error(`Invalid game data:\n${errors.join('\n')}`)
  return {
    manifest: { dataSchema: DATA_SCHEMA, dataVersion, generatedAt: now.toISOString() },
    items,
    professions
  }
}
