import type { Character, Container, KnownRecipe, Profession, Reagent, TrackerSnapshot } from '../shared/types'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)

/** Lua arrays may come back as arrays or as objects with "1","2"… keys. */
function list(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (isObj(v)) return Object.keys(v).sort((a, b) => Number(a) - Number(b)).map((k) => v[k])
  return []
}

function itemCounts(v: unknown): Record<number, number> | undefined {
  if (!isObj(v)) return undefined
  const out: Record<number, number> = {}
  for (const [k, c] of Object.entries(v)) {
    const id = Number(k)
    if (!Number.isInteger(id) || typeof c !== 'number') return undefined
    out[id] = c
  }
  return out
}

function container(v: unknown): Container | undefined {
  if (!isObj(v) || typeof v.seenAt !== 'number') return undefined
  const items = itemCounts(v.items ?? {})
  return items ? { seenAt: v.seenAt, items } : undefined
}

function reagents(v: unknown): Reagent[] {
  return list(v)
    .filter(isObj)
    .filter((r) => typeof r.itemId === 'number' && typeof r.count === 'number')
    .map((r) => ({ itemId: r.itemId as number, count: r.count as number }))
}

function profession(name: string, v: unknown): Profession | undefined {
  if (!isObj(v)) return undefined
  const p: Profession = { name, skill: num(v.skill), maxSkill: num(v.maxSkill) }
  if (typeof v.scannedAt === 'number') p.scannedAt = v.scannedAt
  if (isObj(v.recipes)) {
    p.knownRecipes = Object.entries(v.recipes)
      .filter(([, r]) => isObj(r))
      .map(([rname, r]): KnownRecipe => ({ name: rname, reagents: reagents((r as Obj).reagents) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  return p
}

function character(key: string, v: Obj): Character {
  const professions = isObj(v.professions)
    ? Object.entries(v.professions)
        .map(([n, p]) => profession(n, p))
        .filter((p): p is Profession => p !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name))
    : []
  const c: Character = {
    key,
    name: str(v.name, key),
    realm: str(v.realm),
    race: str(v.race),
    className: str(v.class),
    level: num(v.level),
    updatedAt: num(v.updatedAt),
    professions
  }
  const bags = container(v.bags)
  const bank = container(v.bank)
  if (bags) c.bags = bags
  if (bank) c.bank = bank
  return c
}

/** Turns the parsed AzerothTrackerDB table into a TrackerSnapshot. Tolerant: bad fields are dropped. */
export function normalize(raw: unknown): TrackerSnapshot {
  const db = isObj(raw) ? raw : {}
  const version = num(db.schemaVersion, 1)
  if (version !== 1) throw new Error(`Unsupported schemaVersion ${version}`)

  const characters = isObj(db.characters)
    ? Object.keys(db.characters)
        .sort()
        .filter((k) => isObj((db.characters as Obj)[k]))
        .map((k) => character(k, (db.characters as Obj)[k] as Obj))
    : []

  const itemNames: Record<number, string> = {}
  if (isObj(db.itemNames)) {
    for (const [k, n] of Object.entries(db.itemNames)) {
      if (Number.isInteger(Number(k)) && typeof n === 'string') itemNames[Number(k)] = n
    }
  }

  const snapshot: TrackerSnapshot = { schemaVersion: 1, characters, itemNames }
  const accountBank = container(db.accountBank)
  if (accountBank) snapshot.accountBank = accountBank
  return snapshot
}
