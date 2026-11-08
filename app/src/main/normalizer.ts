import type { Character, Container, Diagnostics, Difficulty, KnownRecipe, Profession, Reagent, Run, TrackerSnapshot } from '../shared/types'

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

const DIFFICULTIES: Difficulty[] = ['orange', 'yellow', 'green', 'gray']

function knownRecipe(key: string, r: Obj): KnownRecipe {
  const out: KnownRecipe = { name: str(r.name, key), reagents: reagents(r.reagents) }
  if (typeof r.spellId === 'number') out.spellId = r.spellId
  if (typeof r.createdItemId === 'number') out.createdItemId = r.createdItemId
  if (typeof r.numMade === 'number') out.numMade = r.numMade
  if (DIFFICULTIES.includes(r.difficulty as Difficulty)) out.difficulty = r.difficulty as Difficulty
  return out
}

function profession(name: string, v: unknown): Profession | undefined {
  if (!isObj(v)) return undefined
  const p: Profession = { name, skill: num(v.skill), maxSkill: num(v.maxSkill) }
  if (typeof v.scannedAt === 'number') p.scannedAt = v.scannedAt
  if (isObj(v.recipes)) {
    p.knownRecipes = Object.entries(v.recipes)
      .filter(([, r]) => isObj(r))
      .map(([key, r]) => knownRecipe(key, r as Obj))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  return p
}

function run(v: unknown): Run | undefined {
  if (!isObj(v) || typeof v.dungeon !== 'string' || v.dungeon === '') return undefined
  if (typeof v.startedAt !== 'number' || typeof v.endedAt !== 'number') return undefined
  return {
    dungeon: v.dungeon,
    ...(typeof v.difficulty === 'string' && v.difficulty !== '' && { difficulty: v.difficulty }),
    startedAt: v.startedAt,
    endedAt: v.endedAt,
    ...(typeof v.level === 'number' && { level: v.level }),
    xp: num(v.xp),
    money: num(v.money),
    deaths: num(v.deaths),
    bosses: list(v.bosses).filter((b): b is string => typeof b === 'string'),
    loot: reagents(v.loot),
    ...(v.completed === true && { completed: true })
  }
}

/** The addon's open run; loot and gold so far come from the bags and money now. */
function activeRun(v: unknown, c: Character): Run | undefined {
  if (!isObj(v)) return undefined
  const start = itemCounts(v.bagsStart ?? {}) ?? {}
  const now = c.bags?.items ?? {}
  const loot = Object.entries(now)
    .map(([id, n]) => ({ itemId: Number(id), count: n - (start[Number(id)] ?? 0) }))
    .filter((l) => l.count > 0)
    .sort((a, b) => a.itemId - b.itemId)
  const r = run({
    ...v,
    endedAt: v.lastSeenAt,
    money: typeof v.moneyStart === 'number' && c.money !== undefined ? c.money - v.moneyStart : 0,
    loot,
    completed: undefined
  })
  return r && { ...r, inProgress: true }
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
  if (typeof v.money === 'number') c.money = v.money
  if (typeof v.moneyAt === 'number') c.moneyAt = v.moneyAt
  if (isObj(v.currencies)) {
    const cur: Record<string, number> = {}
    for (const [n, e] of Object.entries(v.currencies)) {
      if (isObj(e) && typeof e.count === 'number') cur[n] = e.count
    }
    c.currencies = cur
  }
  const bags = container(v.bags)
  const bank = container(v.bank)
  if (bags) c.bags = bags
  if (bank) c.bank = bank
  if (v.runs !== undefined) {
    c.runs = list(v.runs)
      .map(run)
      .filter((r): r is Run => r !== undefined)
      .sort((a, b) => a.startedAt - b.startedAt)
  }
  const open = activeRun(v.activeRun, c)
  if (open) c.runs = [...(c.runs ?? []), open]
  return c
}

export const SUPPORTED_SCHEMA = 3

export class AddonOlderError extends Error {
  constructor() {
    super('The addon is older than the app – install the addon that came with this version and /reload.')
    this.name = 'AddonOlderError'
  }
}

/** Shifts every timestamp so the newest one equals `now` (used for demo data). */
export function rebaseTimes(snapshot: TrackerSnapshot, now: number): TrackerSnapshot {
  const s = structuredClone(snapshot)
  const times: number[] = []
  const containers = [s.accountBank, ...s.characters.flatMap((c) => [c.bags, c.bank])].filter(
    (c): c is Container => c !== undefined
  )
  for (const c of s.characters) {
    times.push(c.updatedAt)
    for (const p of c.professions) if (p.scannedAt !== undefined) times.push(p.scannedAt)
  }
  for (const c of containers) times.push(c.seenAt)
  if (times.length === 0) return s
  const delta = now - Math.max(...times)
  for (const c of s.characters) {
    c.updatedAt += delta
    for (const p of c.professions) if (p.scannedAt !== undefined) p.scannedAt += delta
  }
  for (const c of containers) c.seenAt += delta
  for (const c of s.characters) {
    for (const r of c.runs ?? []) {
      r.startedAt += delta
      r.endedAt += delta
    }
  }
  return s
}

export class AddonNewerError extends Error {
  constructor() {
    super('The addon is newer than the app – please update AzerothTracker.')
    this.name = 'AddonNewerError'
  }
}

function diagnostics(v: unknown): Diagnostics | undefined {
  if (!isObj(v)) return undefined
  const strings = (x: unknown): string[] => list(x).filter((s): s is string => typeof s === 'string')
  return {
    build: str(v.build),
    buildNumber: str(v.buildNumber),
    interface: num(v.interface),
    addonVersion: str(v.addonVersion),
    checkedAt: num(v.checkedAt),
    missing: strings(v.missing),
    legacyApis: strings(v.legacyApis)
  }
}

/** Turns the parsed AzerothTrackerDB table into a TrackerSnapshot. Tolerant: bad fields are dropped. */
export function normalize(raw: unknown): TrackerSnapshot {
  const db = isObj(raw) ? raw : {}
  const version = num(db.schemaVersion, SUPPORTED_SCHEMA)
  if (version > SUPPORTED_SCHEMA) throw new AddonNewerError()
  if (version < SUPPORTED_SCHEMA) throw new AddonOlderError()

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

  const snapshot: TrackerSnapshot = { schemaVersion: SUPPORTED_SCHEMA, characters, itemNames }
  const diag = diagnostics(db.diagnostics)
  if (diag) snapshot.diagnostics = diag
  const accountBank = container(db.accountBank)
  if (accountBank) snapshot.accountBank = accountBank
  return snapshot
}
