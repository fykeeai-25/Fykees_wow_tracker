import type { Run, TrackerSnapshot } from './types'

export interface RunRow {
  run: Run
  characterKey: string
  characterName: string
}

export interface RunFilter {
  dungeon?: string
  characterKey?: string
}

/** Runs of all characters, newest first. */
export function runRows(snapshot: TrackerSnapshot): RunRow[] {
  return snapshot.characters
    .flatMap((c) => (c.runs ?? []).map((run) => ({ run, characterKey: c.key, characterName: c.name })))
    .sort((a, b) => b.run.startedAt - a.run.startedAt)
}

/** Empty filter fields mean "all". */
export function filterRuns(rows: RunRow[], f: RunFilter): RunRow[] {
  return rows.filter((r) => (!f.dungeon || r.run.dungeon === f.dungeon) && (!f.characterKey || r.characterKey === f.characterKey))
}

export function dungeonNames(rows: RunRow[]): string[] {
  return [...new Set(rows.map((r) => r.run.dungeon))].sort((a, b) => a.localeCompare(b))
}

export function runDuration(run: Run): number {
  return Math.max(0, run.endedAt - run.startedAt)
}

/** 45 s · 25 min · 1 h 05 min */
export function durationText(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`
}

export function runTotals(rows: RunRow[]): { count: number; xp: number; money: number; deaths: number; avgDuration: number } {
  const count = rows.length
  const sum = (f: (r: Run) => number): number => rows.reduce((n, r) => n + f(r.run), 0)
  return {
    count,
    xp: sum((r) => r.xp),
    money: sum((r) => r.money),
    deaths: sum((r) => r.deaths),
    avgDuration: count ? Math.round(sum(runDuration) / count) : 0
  }
}
