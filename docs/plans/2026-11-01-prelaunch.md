# AzerothTracker Pre-launch Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make v1 launch-ready: addon data format v2, a game data pack fetched at startup, UI quick wins, demo mode and reproducible builds.

**Architecture:** The addon writes schemaVersion 2 (recipes keyed by spell ID, game difficulty, safe merge). Static game data moves out of the renderer bundle into `data-pack.json`, built and validated by `app/scripts/data-pack.mjs`, shipped as an extra resource, published by CI to the `data-latest` release and refreshed by a main-process `dataStore` at startup; the renderer reads it over IPC. UI changes stay inside the existing renderer components plus small pure helpers in `app/src/shared/`.

**Tech Stack:** as v1 (Electron, electron-vite, React, TypeScript, Vitest, luaparse, chokidar, electron-builder, GitHub Actions) — no new runtime dependencies.

**Spec:** `docs/specs/2026-11-01-prelaunch-design.md` (builds on `docs/specs/2026-11-01-azerothtracker-design.md`)

## Global Constraints

- No OS/Windows notifications anywhere (no `Notification`, no tray balloons). In-app indicators only.
- All copy in English. The repo name appears only in the `DATA_PACK_URL` constant in `app/src/main/dataStore.ts`, never in UI. CI name check excludes exactly that file.
- Wowhead: outbound links only, via `shell.openExternal`, URL must start with `https://www.wowhead.com/`. No fetching/scraping.
- Addon `schemaVersion = 2`; app accepts only 2; higher → message `The addon is newer than the app – please update AzerothTracker.`
- Data pack: `{ manifest: { dataSchema: 1, dataVersion: number, generatedAt: string }, items: Record<string,string>, professions: ProfessionData[] }`. Release tag `data-latest`, assets `data-pack.json`, `data-pack.json.sha256`. Fetch timeout 10 s. Update mode automatic and silent.
- Stale material source: older than 3 days (unchanged). Status bar turns amber when the last /reload is older than 30 min.
- Tests run in GitHub Actions (no local npm). Each task: push failing tests, read CI failure, push implementation, read CI green.

## Review Focus

1. Remote pack with a higher `dataSchema` major → ignored, app keeps current data. Test in Task 4.
2. Corrupt or truncated `userData/data-pack.json` → fall back to bundled pack. Test in Task 4.
3. Network hang / GitHub down → 10 s timeout, app keeps working, `lastCheck.error` set. Test in Task 4.
4. Snapshot recipe has a `spellId` but static recipe only a name (or vice versa) → still matched by name. Test in Task 2.
5. Saved window bounds on a monitor that no longer exists → default bounds. Test in Task 5.

---

### Task 1: Reproducible builds and preview artifacts

**Files:** Create `.github/workflows/lockfile.yml`; Modify `.github/workflows/ci.yml`, `.github/workflows/release.yml`.

- [ ] **Step 1:** `lockfile.yml`: on push to `feat/**` and `main` with paths `app/package.json`, plus `workflow_dispatch`; `permissions: contents: write`; in `app/`: `npm install --package-lock-only --no-audit --no-fund`; if `git status --porcelain app/package-lock.json` is non-empty, commit `chore: update package-lock.json` as `github-actions[bot]` and push.
- [ ] **Step 2:** CI and release install step (`shell: bash`): `if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi`.
- [ ] **Step 3:** `release.yml`: after building, `actions/upload-artifact@v4` named `windows-preview` with `app/dist/AzerothTracker-*.exe` and `app/dist/AzerothTracker-addon-*.zip`, `retention-days: 14`. Remove the base64 renderer dump from `ci.yml` and instead upload `app/out/renderer` as artifact `renderer-preview` (retention 7).
- [ ] **Step 4:** Push; verify: lockfile workflow committed `app/package-lock.json`; `git pull` it; next CI run log shows `npm ci`; release run lists artifact `windows-preview`. Commit `ci: lockfile, npm ci, preview artifacts`.

### Task 2: Addon data format v2

**Files:** Modify `addon/AzerothTracker/AzerothTracker.lua`, `addon/test/harness.lua`, `app/src/shared/types.ts`, `app/src/main/normalizer.ts`, `app/src/main/tracker.ts`, `app/src/shared/professions.ts`, `app/test/fixtures/AzerothTracker.lua`, `app/test/fixtures/truncated.lua`, tests alongside.

**Interfaces:**
- Produces in `types.ts`: `type Difficulty = 'orange'|'yellow'|'green'|'gray'` (moved from professions.ts, re-exported there); `KnownRecipe { name: string; spellId?: number; createdItemId?: number; numMade?: number; difficulty?: Difficulty; reagents: Reagent[] }`; `StaticRecipe` gains `spellId?: number; createdItemId?: number`; `TrackerSnapshot.schemaVersion` is `2`.
- `normalizer.ts`: `export const SUPPORTED_SCHEMA = 2`; `export class AddonNewerError extends Error` (message `The addon is newer than the app – please update AzerothTracker.`); `normalize(raw)` throws `AddonNewerError` when schemaVersion > 2, `Error('Unsupported schemaVersion <n>')` when < 2.
- SavedVariables v2 recipe entry: `recipes["spell:2330"] = { spellId = 2330, name = "Minor Healing Potion", createdItemId = 118, numMade = 1, difficulty = "gray", reagents = {...} }`; key is `"spell:"..id`, or the recipe name when no id.

- [ ] **Step 1: Tests.**
  - Fixtures rewritten to v2 (`schemaVersion = 2`, Thrall's Minor Healing Potion as `"spell:2330"` with the fields above).
  - normalizer: `reads v2 recipe fields` → MHP `{ spellId: 2330, createdItemId: 118, numMade: 1, difficulty: 'gray' }`; `name falls back to the key`; `schemaVersion 3 → AddonNewerError`; `schemaVersion 1 → 'Unsupported schemaVersion 1'`.
  - tracker: `addon newer with previous good → ok + warning equals AddonNewerError message`; `addon newer without previous → error with that message`.
  - professions: `matches known recipe by spellId even if names differ`; `matches by name when static recipe has no spellId`.
  - contract (harness gets `GetTradeSkillRecipeLink` → `|Henchant:2330|h[...]`, `GetTradeSkillItemLink` → item 118, `GetTradeSkillNumMade` → 1,1): `writes spell id, created item, numMade and game difficulty` (`trivial` → `gray`); scenario `uncached-reagent` (second scan returns nil link for one MHP reagent) → MHP still has 2 reagents; `schemaVersion` is 2.
- [ ] **Step 2:** Push, read CI → the new tests fail (not on typos).
- [ ] **Step 3: Implement.** Addon: `SCHEMA_VERSION = 2`; `spellIdFromLink(link)` matches `enchant:(%d+)` or `spell:(%d+)`; Craft uses `GetCraftRecipeLink` if present else `GetCraftItemLink`; difficulty map `optimal→orange, medium→yellow, easy→green, trivial→gray`; a recipe with any nil reagent link is skipped (previous entry kept); `scanTradeSkill`/`scanCraft` go through a 0.5 s `C_Timer.After` throttle (immediate when `C_Timer` is missing). App: normalizer/tracker/professions per Interfaces; `classifyRecipes` builds the known set from spellIds and names and a static recipe is known if its `spellId` or `name` is in it.
- [ ] **Step 4:** Push, CI green (incl. contract test). Commit `feat: addon data format v2`.

### Task 3: Data pack build and validation

**Files:** Create `app/scripts/data-pack.mjs`, `app/scripts/build-data-pack.mjs`, `app/scripts/data-pack.test.mjs`, `data/items.json`, `.github/workflows/data.yml`; Modify `data/professions/alchemy.json` (items moved out, spell IDs added), `app/vitest.config.ts` (include `scripts/**/*.test.mjs`), `app/package.json` (scripts), `app/electron-builder.yml`, `.gitignore`.

**Interfaces:**
- `data-pack.mjs` exports `validateData({ items, professions }): string[]` (error messages; empty = valid) and `buildPack(dataDir: string, dataVersion: number, now = new Date()): DataPack` (throws `Error('Invalid game data:\n' + errors.join('\n'))`).
- CLI: `node scripts/build-data-pack.mjs <dataDir> <outFile> <dataVersion>`; npm script `data:pack` = `node scripts/build-data-pack.mjs ../data resources/data-pack.json 0`, run by `predev`, `prebuild` and before `dist:win`.
- `types.ts` gains `DataPack { manifest: { dataSchema: number; dataVersion: number; generatedAt: string }; items: Record<string, string>; professions: ProfessionData[] }`; `ProfessionData` loses `items`.
- Sample spell IDs: MHP 2330 (creates 118), Lion's Strength 2329 (2454), Lesser Healing 2337 (858), Swiftness 2335 (2459), Wisdom 3171 (3383), Healing Potion 3447 (929); `items.json` holds all reagent and created item names.

- [ ] **Step 1: Tests (`data-pack.test.mjs`).** Valid sample → `[]`; each rule produces one message containing: `missing item name 2447` (reagent id without name), `duplicate spellId 2330`, `skill ranges out of order in Minor Healing Potion` (learnAt ≤ yellow ≤ green ≤ gray), `unknown source type "bogus"`; `buildPack` on `../data` → `manifest.dataSchema === 1`, `dataVersion` as passed, professions length ≥ 1, items has `2447`.
- [ ] **Step 2:** Push → RED. **Step 3:** Implement; `data.yml`: on push to `main` paths `data/**`, `app/scripts/data-pack*.mjs`; build pack with `${{ github.run_number }}`, `sha256sum data-pack.json | cut -d' ' -f1 > data-pack.json.sha256`, `gh release view data-latest || gh release create data-latest --prerelease --title "Game data" --notes "Auto-published game data pack"`, `gh release upload data-latest data-pack.json data-pack.json.sha256 --clobber`. `electron-builder.yml`: `extraResources: [{ from: resources, to: . }]`; `.gitignore`: `app/resources/data-pack.json`. **Step 4:** CI green. Commit `feat: game data pack build and validation`.

### Task 4: Data store (bundled + downloaded + remote) and renderer switch

**Files:** Create `app/src/main/dataStore.ts`, `dataStore.test.ts`, `app/src/renderer/DataContext.tsx`; Modify `app/src/main/index.ts`, `app/src/preload/index.ts`, `app/src/shared/ipc.ts`, `app/src/shared/materials.ts`, `app/src/renderer/App.tsx`, `StatusBar.tsx`, `professions/*`, `app/test/snapshot.ts`; Delete `app/src/renderer/staticData.ts`.

**Interfaces:**
- `export const DATA_PACK_URL = 'https://github.com/fykeeai-25/Fykees_wow_tracker/releases/download/data-latest/data-pack.json'` (sha at `+ '.sha256'`).
- `type RemoteFetch = (url: string, signal: AbortSignal) => Promise<string>`.
- `interface DataState { pack: DataPack; source: 'bundled' | 'downloaded'; lastCheck?: { at: number; ok: boolean; error?: string } }`.
- `createDataStore(opts: { bundledFile: string; userFile: string; fetchText: RemoteFetch; onChange(s: DataState): void; timeoutMs?: number /* 10000 */; now?: () => number }): { get(): DataState; refresh(): Promise<void> }`. Load order: bundled, then userFile if parseable, `dataSchema` equal and `dataVersion` > bundled. `refresh`: fetch sha + pack (abort after timeoutMs), verify `sha256(pack) === sha.trim()`, parse, `validateManifest`, adopt only if `dataVersion` > current and same `dataSchema` → write userFile, `onChange`. Every outcome sets `lastCheck` and calls `onChange`.
- IPC: `data:get` → `DataState`, `data:changed` event; `AzerothApi.getData(): Promise<DataState>`, `onData(cb): () => void`.
- `materials.ts`: `itemName(id, snapshot, items?: Record<string,string>)`; `materialAvailability(reagents, snapshot, items | undefined, now, multiplier?)`.
- `DataContext.tsx`: `DataProvider({ value: DataState | undefined })`, `useGameData(): { pack?: DataPack; professionData(name): ProfessionData | undefined; items: Record<string,string> }`.
- `test/snapshot.ts` exports `samplePack(): DataPack` (via `buildPack`) replacing `alchemy`.

- [ ] **Step 1: Tests (`dataStore.test.ts`, temp dirs, fake `fetchText`).** `uses bundled when no user file`; `uses newer downloaded user file`; `corrupt user file → bundled`; `user file with other dataSchema → bundled`; `refresh adopts newer remote and writes user file`; `refresh ignores older or equal remote`; `refresh rejects bad sha (lastCheck.error 'checksum mismatch')`; `refresh ignores remote with dataSchema 2`; `refresh times out after timeoutMs (fake fetch never resolves; timeoutMs 50) → lastCheck.ok false, pack unchanged`. Existing renderer/material tests switch to `samplePack()` + `DataProvider`; StatusBar test: `shows data version` → `Data v12`.
- [ ] **Step 2:** Push → RED. **Step 3:** Implement; main wiring: bundled file `app.isPackaged ? join(process.resourcesPath, 'data-pack.json') : join(app.getAppPath(), 'resources', 'data-pack.json')`, user file `join(userData, 'data-pack.json')`, `fetchText` via `net.fetch` (`signal`), call `refresh()` once after window creation. CI name check: `git grep -il 'fyke[e]' -- app addon data .github ':!app/src/main/dataStore.ts'`. **Step 4:** CI green; renderer preview screenshot shows recipes from the pack. Commit `feat: runtime game data pack with silent updates`.

### Task 5: UI quick wins, window prefs, Wowhead links

**Files:** Modify renderer components, `styles.css`, `app/src/shared/status.ts`, `app/src/shared/materials.ts`, `app/src/main/index.ts`, preload, ipc; Create `app/src/shared/wowhead.ts`, `app/src/main/windowState.ts` (+ tests), `app/src/renderer/classColors.ts`.

**Interfaces:**
- `materials.ts`: `MaterialRow.perCraft: number`; `canCraft(rows: MaterialRow[]): { count: number; limitedBy?: string; missing?: string }` (count = min floor(total/perCraft); limitedBy = name of the row giving the min when count > 0; missing = first row with total < perCraft when count = 0; no rows → count 0, nothing else).
- `status.ts`: `agoText(seconds: number): string` (`just now` < 60 s, `N min ago`, `N h ago` < 24 h, `1 day ago`, `N days ago`); `isOld(load, now): boolean` (> 1800 s); `statusText(load, now, tz?)`: fresh → `Updated HH:MM · <ago>`; old → `Last /reload <ago>`; warning appended ` – <warning>`; missing/error unchanged.
- `wowhead.ts`: `WOWHEAD_BASE` (confirm the Forever path on wowhead.com at implementation; fallback `https://www.wowhead.com/classic/`), `wowheadItemUrl(id)`, `wowheadSpellUrl(id)`; main IPC `shell:openWowhead(url)` refuses anything not starting with `https://www.wowhead.com/`.
- `windowState.ts`: `interface WindowPrefs { bounds?: { x: number; y: number; width: number; height: number }; alwaysOnTop: boolean }`; `readWindowPrefs(file): WindowPrefs` (invalid → `{ alwaysOnTop: false }`); `writeWindowPrefs(file, p)`; `visibleBounds(bounds, displays: { x; y; width; height }[]): bounds | undefined` (undefined unless ≥ 100×100 px of it is on some display). IPC `window:getPrefs`, `window:setAlwaysOnTop(on)`.
- Copy: sections `Known`, `Learnable now`, `Learnable at <skill>`, `Known, not in database`; row suffix `req. <learnAt>`; quantity label `Craft ×`; materials `Need N · Have M`, sources `Thrall · Bags 4 · seen today` / `Thrall · Bank 8 · seen 4 days ago`, `Account bank · 20 · seen today`; unscanned `<Name>'s bank isn't scanned. Open it in game, then /reload.` (one line per character); headline `Can craft N× · limited by <item>` / `Can craft – missing <item>`; setup `That isn't the game folder. Pick the one with Interface and WTF, usually …\_forever_.`, `This folder does not exist.`, `No WoW account found in WTF/Account. Log in to the game once, then try again.`, accounts `Several accounts found. Which one should AzerothTracker follow?`; character line 2 `Lv 24 Shaman · Firemaw` (class token title-cased); difficulty glyphs orange `▲`, yellow `●`, green `○`, gray `–` with `title` `orange < Y ≤ yellow < G ≤ green < R ≤ gray` filled with the ranges.

- [ ] **Step 1: Tests.** `canCraft` (fixture: MHP → `{count: 3, limitedBy: 'Earthroot'}`; with bruiseweed recipe → `{count: 0, missing: 'Bruiseweed'}`); `agoText` boundaries (59 → `just now`, 60 → `1 min ago`, 3600 → `1 h ago`, 86400 → `1 day ago`, 172800 → `2 days ago`); `statusText` fresh/old; `visibleBounds` on/off screen; `readWindowPrefs` invalid; `wowheadItemUrl(2447)` starts with `https://www.wowhead.com/`; component tests for every copy string above, selected row has `aria-current="true"`, class colour for Thrall (`style.color` = SHAMAN `#0070dd`), settings popover opens on gear click (`role="dialog"`, name `Settings`) and closes on Escape.
- [ ] **Step 2:** Push → RED. **Step 3:** Implement; CSS: base 15px, `font-variant-numeric: tabular-nums` on counts, selected row background + 3px gold left border, stale = muted colour + `🕒`, amber status bar class `old`; main: restore `visibleBounds` with `screen.getAllDisplays()`, save on `close`, `minWidth: 640`, `setAlwaysOnTop` from prefs; pin toggle in settings popover. **Step 4:** CI green; preview screenshot reviewed. Commit `feat(ui): pre-launch quick wins`.

### Task 6: Demo mode

**Files:** Create `app/resources/demo/WTF/Account/DEMO/SavedVariables/AzerothTracker.lua` (copy of the v2 fixture); Modify `config.ts`, `tracker.ts`, `ipc.ts`, preload, `main/index.ts`, `SetupScreen.tsx`, `StatusBar.tsx`, `types.ts` (+ tests).

**Interfaces:** `Config.demo?: boolean`; `AppState` ready gains `demo: boolean`; `Tracker.useDemo(demoGameDir: string): void` writes `{ gameDir: demoGameDir, account: 'DEMO', demo: true }`; `setGameDir` drops `demo`; IPC `config:useDemo`; main passes `app.isPackaged ? join(process.resourcesPath, 'demo') : join(app.getAppPath(), 'resources', 'demo')`. Status bar prefix `Demo data · `. Setup button `Try with demo data`.

- [ ] **Step 1: Tests.** tracker `useDemo → ready, account DEMO, demo true, 2 characters`; `setGameDir after demo → demo false`; SetupScreen `Try with demo data` calls `onUseDemo`; StatusBar demo prefix.
- [ ] **Step 2:** RED. **Step 3:** Implement. **Step 4:** CI green; Windows release build contains `resources/demo` (log of electron-builder or artifact listing). Commit `feat: demo mode`.

### Task 7: Docs

- [ ] Update `README.md` (data pack, demo mode, preview artifacts, no notifications rule) and `docs/specs/2026-11-01-prelaunch-design.md` status → implemented. Commit `docs: pre-launch package`.
