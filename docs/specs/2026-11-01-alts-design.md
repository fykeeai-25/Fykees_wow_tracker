# AzerothTracker – Alts module design (v1: item search, gold & currencies)

Date: 2026-11-01
Status: approved in chat (owner: "continue with the Alts overview, item search and gold")
Builds on: `2026-11-01-azerothtracker-design.md`, `2026-11-01-prelaunch-design.md`

## Goal

A second module tab, **Alts**, that answers "where is this item?" across all characters and
shows every character's gold and currencies at a glance. Rested XP, profession cooldowns,
raid lockouts and reputations come later.

## Product rules (unchanged)

No OS notifications; English only; in-app indicators only.

## Addon (data format v3)

- `schemaVersion = 3` (no real v2 files exist yet – game not launched; the app accepts only 3).
- Per character:
  - `money` (copper, from `GetMoney()`) and `moneyAt` (unix time) – on `PLAYER_LOGIN`,
    `PLAYER_MONEY` and `PLAYER_LOGOUT`.
  - `currencies = { [name] = { id = <currencyID or nil>, count = <quantity> } }` from
    `C_CurrencyInfo.GetCurrencyListSize/GetCurrencyListInfo` when that API exists (header rows
    skipped), on `PLAYER_LOGIN`, `CURRENCY_DISPLAY_UPDATE` and `PLAYER_LOGOUT`. If the API is
    missing, `currencies` is not written.

## App

- `Character` gains `money?: number`, `moneyAt?: number`, `currencies?: Record<string, number>`.
- **Item search** (`Find item…`): case-insensitive substring match on item names from the game
  data pack and the names the addon saw; at least 2 characters; only items somebody owns; sorted
  by name; at most 50 results. Each hit shows the item, the total count, a Wowhead link, and the
  same per-source breakdown as the Materials panel (`Thrall · Bank 8 · seen 4 days ago`, stale
  sources marked). Empty result: `No item matching "<query>".`
- **Characters table:** class icon + name (class colour) + `Lv 24`, gold as `12g 34s 56c` with
  coin colours, one column per currency that at least one character has (sorted by name),
  `Last seen` (`2 h ago`). Characters without money data show `–`. A final **Total** row sums
  gold (and each currency).
- The tab appears next to Professions: `Professions | Alts`.

## Testing

- Addon contract test: money, moneyAt and currencies written; no currencies when the API is
  missing; schemaVersion 3.
- Normalizer: v3 fields, bad types dropped.
- Logic: search matching rules (min length, case, owned only, limit, both name sources), totals,
  currency columns.
- UI: search results and breakdown, empty result text, table values, total row, `–` for missing.
