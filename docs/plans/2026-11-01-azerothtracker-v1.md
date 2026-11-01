# AzerothTracker v1 (Professions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AzerothTracker skeleton: an in-game addon that writes character/profession/inventory data to SavedVariables, and a Windows Electron app that watches that file and shows the Professions module.

**Architecture:** Three parts. `addon/AzerothTracker` (Lua) collects data into `AzerothTrackerDB`. `app/` is an electron-vite project: the main process locates, watches, parses (Lua → JS via `luaparse`) and normalizes the file into a `TrackerSnapshot`, then pushes an `AppState` to the React renderer over IPC. Pure domain logic (recipe classification, material availability, status text) lives in `app/src/shared/` and is shared by main and renderer. Static game data is JSON in `data/professions/` and is bundled into the renderer at build time.

**Tech Stack:** Node ≥ 20, Electron, electron-vite, React 18+, TypeScript (strict), Vitest, @testing-library/react + jsdom, luaparse, chokidar, electron-builder, GitHub Actions.

**Spec:** `docs/specs/2026-11-01-azerothtracker-design.md`

## Global Constraints

- Product name everywhere in code, UI, addon, data, package names and build output: `AzerothTracker`. The string "Fykee" (any case) must not appear under `app/`, `addon/`, `data/` or `.github/`. Only the repo name keeps it.
- SavedVariables variable: `AzerothTrackerDB`. Addon folder/file: `addon/AzerothTracker/AzerothTracker.toc`, `AzerothTracker.lua`.
- UI copy is English (e.g. tab label `Professions`, status `Data from /reload at HH:MM`). *Changed from Czech on 2026-11-01 after v1 was built; the Czech UI strings quoted in the tasks below are historical — the code and tests are the source of truth.*
- One WoW account at a time. If several exist in `WTF/Account/`, the user picks one; choice is stored and changeable in settings. Data from several accounts is never merged.
- The user picks the game folder manually (the folder containing `Interface` and `WTF`, e.g. `D:\Hry\World of Warcraft\_forever_`). No auto-detection of install location.
- SavedVariables path: `<gameDir>/WTF/Account/<account>/SavedVariables/AzerothTracker.lua`.
- Stale threshold for a container (bags/bank/account bank): older than 3 days → `STALE_AFTER_SECONDS = 259200`.
- Runtime target: Windows (portable `.exe` built by GitHub Actions on `windows-latest`). Development and tests run on macOS/Linux with fixtures; no game required.
- Dependencies: install current stable versions at implementation time and commit `app/package-lock.json`. No other runtime dependencies than listed in Tech Stack without a reason in the commit message.
- Out of scope for v1: Gear/Dungeons/Trainer modules, levelling planner, auction prices, Blizzard API, auto-installing the addon, auto-update, running the app on macOS as a product.

## Review Focus

1. File being written by the game while we read it (truncated Lua) → keep last good snapshot, show warning, retry on next change. Test in Task 4.
2. Character that never opened its bank / profession window → bank or recipe list absent, UI shows "nenaskenováno" instead of crashing or showing 0. Tests in Task 3 and Task 7.
3. Known recipe missing from static data → listed under "Neznámé recepty" with addon reagents. Test in Task 5.
4. Game folder chosen one level too high/low (no `WTF`) or account folder deleted later → back to setup screen with reason. Test in Task 4.
5. Item present in reagents but not in static `items` nor addon `itemNames` → show `Item #<id>`. Test in Task 5.

---

## SavedVariables format (contract between addon and app, schemaVersion 1)

```lua
AzerothTrackerDB = {
  ["schemaVersion"] = 1,
  ["itemNames"] = { [2447] = "Peacebloom" },          -- every itemId the addon has seen
  ["accountBank"] = { ["seenAt"] = 1761980000, ["items"] = { [2447] = 20 } },  -- optional
  ["characters"] = {
    ["Firemaw-Thrall"] = {                            -- key "<Realm>-<Name>"
      ["name"] = "Thrall", ["realm"] = "Firemaw",
      ["race"] = "Orc", ["class"] = "SHAMAN", ["level"] = 24,
      ["updatedAt"] = 1761980000,                     -- unix seconds
      ["professions"] = {
        ["Alchemy"] = {
          ["skill"] = 142, ["maxSkill"] = 150,
          ["scannedAt"] = 1761980000,                 -- absent if window never opened
          ["recipes"] = {                             -- absent if window never opened
            ["Minor Healing Potion"] = { ["reagents"] = { { ["itemId"] = 2447, ["count"] = 1 }, { ["itemId"] = 2449, ["count"] = 1 } } },
          },
        },
        ["Herbalism"] = { ["skill"] = 160, ["maxSkill"] = 225 },  -- gathering: no recipes
      },
      ["bags"] = { ["seenAt"] = 1761980000, ["items"] = { [2447] = 4 } },
      ["bank"] = { ["seenAt"] = 1761900000, ["items"] = { [2447] = 8 } },  -- absent until bank opened
    },
  },
}
```

## Static data format (`data/professions/<slug>.json`)

```json
{
  "profession": "Alchemy",
  "items": { "2447": "Peacebloom", "2449": "Earthroot" },
  "recipes": [
    { "name": "Minor Healing Potion", "learnAt": 1,
      "skillRange": { "yellow": 55, "green": 75, "gray": 95 },
      "source": { "type": "trainer", "cost": 0 },
      "reagents": [ { "itemId": 2447, "count": 1 }, { "itemId": 2449, "count": 1 } ] }
  ]
}
```
`source.type` ∈ `trainer | vendor | drop | quest | unknown`; `cost` in copper, optional. Colors: skill < yellow → orange; < green → yellow; < gray → green; else gray.

## File Structure

```
.gitignore                                   (exists; extend)
README.md                                    install + dev instructions
addon/AzerothTracker/AzerothTracker.toc
addon/AzerothTracker/AzerothTracker.lua
data/professions/alchemy.json                sample data
app/package.json, tsconfig*.json, electron.vite.config.ts, electron-builder.yml, vitest.config.ts
app/src/shared/types.ts                      domain + IPC types
app/src/shared/professions.ts                difficultyColor, classifyRecipes
app/src/shared/materials.ts                  materialAvailability, itemName
app/src/shared/status.ts                     statusText
app/src/main/index.ts                        window, wiring
app/src/main/config.ts                       readConfig / writeConfig
app/src/main/locator.ts                      validateGameDir, listAccounts, savedVariablesPath
app/src/main/luaParser.ts                    parseSavedVariables
app/src/main/normalizer.ts                   normalize
app/src/main/tracker.ts                      createTracker (state machine + watcher)
app/src/preload/index.ts                     window.azeroth bridge
app/src/renderer/…                           App, SetupScreen, StatusBar, modules registry, ProfessionsView, MaterialsPanel
app/src/renderer/staticData.ts               loads data/professions/*.json via import.meta.glob
app/test/fixtures/AzerothTracker.lua         2 characters, as format above
app/test/fixtures/truncated.lua              same file cut mid-table
.github/workflows/ci.yml, release.yml
```

---

### Task 1: Project scaffold

**Files:** Create `app/` (electron-vite React-TS template, renamed), `app/vitest.config.ts`, `app/src/shared/smoke.test.ts`; Modify `.gitignore`, `README.md`.

**Interfaces:** Produces npm scripts in `app/package.json`: `dev`, `build`, `test` (`vitest run`), `typecheck`, `dist:win` (`electron-vite build && electron-builder --win portable`).

- [ ] **Step 1:** Scaffold electron-vite React + TypeScript project into `app/`; set `"name": "azerothtracker"`, `"productName": "AzerothTracker"`, window title `AzerothTracker`. Remove template demo content. Enable TS `strict`.
- [ ] **Step 2:** Add Vitest (`environment: node` default; renderer tests opt into jsdom via `// @vitest-environment jsdom`). Write `smoke.test.ts`: `expect(1 + 1).toBe(2)`.
- [ ] **Step 3:** Run `cd app && npm test && npm run typecheck`. Expected: 1 passed, no type errors.
- [ ] **Step 4:** Add `app/electron-builder.yml`: `appId: cz.azerothtracker.app`, `productName: AzerothTracker`, `win.target: portable`, `artifactName: AzerothTracker-${version}.exe`.
- [ ] **Step 5:** README: what the app is, dev (`cd app && npm install && npm run dev`), tests. Extend `.gitignore` with `app/node_modules/`, `app/out/`, `app/dist/`.
- [ ] **Step 6:** Verify name rule: `git grep -il fykee -- app addon data .github` → no output.
- [ ] **Step 7:** Commit `chore: scaffold AzerothTracker electron app`.

### Task 2: Lua SavedVariables parser

**Files:** Create `app/src/main/luaParser.ts`, `app/src/main/luaParser.test.ts`, `app/test/fixtures/AzerothTracker.lua`, `app/test/fixtures/truncated.lua`.

**Interfaces:** Produces `parseSavedVariables(source: string, varName?: string /* default 'AzerothTrackerDB' */): unknown` and `class LuaParseError extends Error`.

- [ ] **Step 1:** Write fixture `AzerothTracker.lua` per the format section: character `Firemaw-Thrall` (Alchemy 142/150 with recipe `Minor Healing Potion`; Herbalism 160/225; bags `{2447=4}` seenAt = fixture now; bank `{2447=8}` seenAt = now − 4 days) and character `Firemaw-Jaina` (level 10, no professions, bags `{2449=3}`, no bank); `accountBank {2447=20}`; `itemNames` for 2447, 2449. Use fixture now = `1761980000`. `truncated.lua` = first ~60% of that file.
- [ ] **Step 2:** Tests:
  - `parses fixture`: result `.schemaVersion === 1`, `.characters['Firemaw-Thrall'].professions.Alchemy.skill === 142`, `.characters['Firemaw-Thrall'].bags.items[2447] === 4`.
  - `array-like tables become arrays`: `recipes['Minor Healing Potion'].reagents` is an array of length 2 with `{itemId:2447,count:1}` first.
  - `numeric keys stay usable`: `itemNames[2447] === 'Peacebloom'` (object with string keys `"2447"`).
  - `throws LuaParseError on truncated.lua`.
  - `throws LuaParseError when variable missing` (`parseSavedVariables('Other = {}')`).
  - `decodes UTF-8`: `X = { ["n"] = "Žluťoučký" }` → `n === 'Žluťoučký'`.
  - `handles escaped strings`: `X = { ["a"] = "it\\'s \\"q\\"" }` with varName `X` → `a === 'it\'s "q"'`.
- [ ] **Step 3:** Run `npx vitest run src/main/luaParser.test.ts` → FAIL (module missing).
- [ ] **Step 4:** Implement with `luaparse` (`luaVersion: '5.1'`). Find the `AssignmentStatement` whose target is `varName`; convert `TableConstructorExpression` recursively: if every field is `TableValue` → array, else object (`TableKey` with numeric literal → string key; `TableKeyString` → name). Literals: string, number, boolean, nil → `null`. Strings: WoW writes UTF-8 bytes, so parse with `encodingMode: 'x-user-defined'` and decode `.value` back to UTF-8 (chars ≥ U+F780 → byte `code - 0xF700`, other chars → their code, then `TextDecoder('utf-8')`). Wrap luaparse errors in `LuaParseError`.
- [ ] **Step 5:** Run tests → PASS. Commit `feat(app): parse AzerothTracker SavedVariables`.

### Task 3: Domain types and normalizer

**Files:** Create `app/src/shared/types.ts`, `app/src/main/normalizer.ts`, `app/src/main/normalizer.test.ts`.

**Interfaces:** Produces in `types.ts`:
```ts
type ItemCounts = Record<number, number>
interface Container { seenAt: number; items: ItemCounts }
interface Reagent { itemId: number; count: number }
interface KnownRecipe { name: string; reagents: Reagent[] }
interface Profession { name: string; skill: number; maxSkill: number; scannedAt?: number; knownRecipes?: KnownRecipe[] } // undefined = never scanned
interface Character { key: string; name: string; realm: string; race: string; className: string; level: number; updatedAt: number; professions: Profession[]; bags?: Container; bank?: Container }
interface TrackerSnapshot { schemaVersion: number; characters: Character[]; accountBank?: Container; itemNames: Record<number, string> }
interface StaticRecipe { name: string; learnAt: number; skillRange: { yellow: number; green: number; gray: number }; source: { type: 'trainer'|'vendor'|'drop'|'quest'|'unknown'; cost?: number }; reagents: Reagent[] }
interface ProfessionData { profession: string; items: Record<string, string>; recipes: StaticRecipe[] }
type LoadState = { status: 'ok'; snapshot: TrackerSnapshot; fileUpdatedAt: number; warning?: string } | { status: 'missing' } | { status: 'error'; message: string }
type AppState = { phase: 'needs-game-dir'; reason?: 'missing-dir'|'missing-wtf'|'no-accounts' } | { phase: 'needs-account'; gameDir: string; accounts: string[] } | { phase: 'ready'; gameDir: string; account: string; load: LoadState }
```
and `normalize(raw: unknown): TrackerSnapshot` (throws `Error('Unsupported schemaVersion <n>')` if schemaVersion ≠ 1).

- [ ] **Step 1:** Tests (use `parseSavedVariables(fixture)` as input):
  - `characters sorted by key`, 2 characters; Thrall `className === 'SHAMAN'`, `level === 24`.
  - `Herbalism has knownRecipes undefined` (gathering / never scanned) and Alchemy `knownRecipes[0].reagents` length 2.
  - `Jaina has no bank` → `bank === undefined`, `professions` is `[]`.
  - `itemNames keys are numbers` → `itemNames[2447] === 'Peacebloom'`.
  - `missing optional sections default` → `normalize({schemaVersion:1})` gives `characters: []`, `itemNames: {}`, no accountBank.
  - `rejects other schemaVersion` → `normalize({schemaVersion:2})` throws.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement (tolerant: wrong-typed fields are dropped, not thrown). **Step 4:** Run → PASS. **Step 5:** Commit `feat(app): normalize tracker snapshot`.

### Task 4: Config, locator and tracker state machine

**Files:** Create `app/src/main/config.ts`, `locator.ts`, `tracker.ts` and tests `config.test.ts`, `locator.test.ts`, `tracker.test.ts` (use `fs.mkdtemp` temp dirs to build fake game folders).

**Interfaces:**
- `interface Config { gameDir?: string; account?: string }`; `readConfig(file: string): Config` (missing/invalid file → `{}`); `writeConfig(file: string, cfg: Config): void`.
- `validateGameDir(dir: string): { ok: true } | { ok: false; reason: 'missing-dir'|'missing-wtf' }`; `listAccounts(gameDir: string): string[]` (subdirs of `WTF/Account` excluding `SavedVariables`, sorted); `savedVariablesPath(gameDir: string, account: string): string`.
- `createTracker(opts: { configFile: string; onState: (s: AppState) => void; watch?: (file: string, onChange: () => void) => () => void }): { start(): void; setGameDir(dir: string): void; setAccount(account: string): void; getState(): AppState; stop(): void }`. Default `watch` uses chokidar with `awaitWriteFinish: { stabilityThreshold: 500 }`, `ignoreInitial: true`; it must also fire when the file is created later.

Rules: no/invalid gameDir → `needs-game-dir` (with reason). 0 accounts → `needs-game-dir` reason `no-accounts`. 1 account → auto-select and save. >1 and saved account not in list → `needs-account`. Ready: read file → missing → `{status:'missing'}`; parse/normalize error → if last good exists `{status:'ok', snapshot: lastGood, fileUpdatedAt: lastGoodMtime, warning: 'Soubor se nepodařilo načíst, zobrazuji poslední platná data.'}`, else `{status:'error', message}`. `fileUpdatedAt` = file mtime in unix seconds.

- [ ] **Step 1:** Tests:
  - config: round-trip; `readConfig` of nonexistent and of `"not json"` → `{}`.
  - locator: `validateGameDir` for nonexistent dir → `missing-dir`; dir without `WTF` → `missing-wtf`; `listAccounts` with `WTF/Account/{ACC1,ACC2,SavedVariables}` → `['ACC1','ACC2']`; `savedVariablesPath('/g','ACC1')` ends with `WTF/Account/ACC1/SavedVariables/AzerothTracker.lua` (use `path.join`).
  - tracker (inject fake `watch` that captures `onChange`):
    - `no config → needs-game-dir`.
    - `single account auto-selected and persisted` → phase `ready`, config file now has `account`.
    - `two accounts → needs-account`; after `setAccount('ACC2')` → `ready`.
    - `file missing → load.status 'missing'`; then copy fixture in and call captured onChange → `'ok'` with 2 characters.
    - `truncated after good → ok with warning and previous snapshot`.
    - `truncated with no previous → error`.
    - `account folder removed then restart → needs-game-dir no-accounts`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. **Step 5:** Commit `feat(app): locate and watch SavedVariables`.

### Task 5: Professions and materials logic

**Files:** Create `app/src/shared/professions.ts`, `materials.ts`, `status.ts` with tests alongside; create `data/professions/alchemy.json` (sample: `Minor Healing Potion` learnAt 1, `Elixir of Lion's Strength` learnAt 1, `Swiftness Potion` learnAt 60 vendor, `Lesser Healing Potion` learnAt 55, `Elixir of Wisdom` learnAt 145 (=next after 142), `Healing Potion` learnAt 145; realistic Classic-like values are fine, mark file with `"_sample": true`).

**Interfaces:**
- `type Difficulty = 'orange'|'yellow'|'green'|'gray'`; `difficultyColor(r: StaticRecipe, skill: number): Difficulty`.
- `interface RecipeView { recipe: StaticRecipe; difficulty: Difficulty }`; `classifyRecipes(p: Profession, data: ProfessionData): { scanned: boolean; known: RecipeView[]; availableNow: RecipeView[]; availableNext: RecipeView[]; unknownKnown: KnownRecipe[] }`. `availableNow` = not known, `learnAt ≤ skill`. `availableNext` = not known, `learnAt` equal to the smallest `learnAt > skill`. Lists sorted by `learnAt` then name. If `p.knownRecipes` undefined → `scanned: false`, `known: []`, `unknownKnown: []`, others still computed.
- `STALE_AFTER_SECONDS = 259200`; `interface MaterialSource { container: 'bags'|'bank'|'accountBank'; characterKey?: string; characterName?: string; count: number; seenAt: number; stale: boolean }`; `interface MaterialRow { itemId: number; name: string; needed: number; total: number; enough: boolean; sources: MaterialSource[] }`; `materialAvailability(reagents: Reagent[], snapshot: TrackerSnapshot, data: ProfessionData | undefined, now: number, multiplier?: number /* default 1 */): MaterialRow[]`. Sources with count 0 omitted; ordered bags → bank per character (character key order), then accountBank.
- `itemName(id: number, snapshot: TrackerSnapshot, data?: ProfessionData): string` → static name, else addon name, else `Item #<id>`.
- `statusText(load: LoadState, now: number, tz?: string): string` → ok: `Data z /reload v HH:MM` (24h, local time; if not today: `Data z /reload d. M. v HH:MM`); missing: `Zatím žádná data – nainstaluj addon, přihlas se a dej /reload.`; error: `Chyba načítání: <message>`.

- [ ] **Step 1:** Tests:
  - `difficultyColor`: range y55/g75/g95 → skill 30 orange, 55 yellow, 80 green, 95 gray.
  - `classifyRecipes` with Thrall's Alchemy (142, knows Minor Healing Potion) → known = [Minor Healing Potion], availableNow includes Lion's Strength, Lesser Healing, Swiftness, excludes known; availableNext = [Elixir of Wisdom, Healing Potion].
  - `unknown known recipe` → add `Mystery Brew` to knownRecipes → appears in `unknownKnown`.
  - `unscanned profession` → `scanned false`, `known []`.
  - `materialAvailability` for Minor Healing Potion with fixture snapshot, now=1761980000 → 2447 row: total 32 (bags 4 + bank 8 + accountBank 20), bank source `stale: true` (4 days old), bags `stale: false`, `enough: true`; 2449 row: total 3 from Jaina's bags; with `multiplier 5` → 2449 `needed 5`, `enough false`.
  - `itemName(99999, …)` → `Item #99999`.
  - `statusText` ok same day → `Data z /reload v 14:32` (use fixed tz `Europe/Prague` and a timestamp for 14:32 that day); missing/error texts exact.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. **Step 5:** Commit `feat(app): professions and materials logic`.

### Task 6: IPC bridge and main wiring

**Files:** Modify `app/src/main/index.ts`, `app/src/preload/index.ts`; create `app/src/shared/ipc.ts`, `app/src/renderer/env.d.ts`.

**Interfaces:** Channel names in `ipc.ts`: `state:get`, `state:changed`, `config:chooseGameDir`, `config:setAccount`. Preload exposes `window.azeroth: { getState(): Promise<AppState>; onState(cb: (s: AppState) => void): () => void; chooseGameDir(): Promise<void>; setAccount(account: string): Promise<void> }`. `chooseGameDir` opens `dialog.showOpenDialog({ properties: ['openDirectory'] })` and calls `tracker.setGameDir`. Config file: `path.join(app.getPath('userData'), 'config.json')`. Window: 1100×800, min 800×600, title `AzerothTracker`, `contextIsolation: true`, `nodeIntegration: false`.

- [ ] **Step 1:** Implement wiring (no unit test; covered by typecheck + manual run).
- [ ] **Step 2:** Run `npm run typecheck && npm test` → pass. Run `npm run dev`, choose `app/test/fixtures` style fake game folder (create `/tmp/fakewow/WTF/Account/ACC1/SavedVariables/AzerothTracker.lua` from fixture) → window shows state (temporary `<pre>{JSON}</pre>` is fine until Task 7).
- [ ] **Step 3:** Commit `feat(app): wire tracker to renderer via IPC`.

### Task 7: Renderer UI – setup, status bar, Professions module

**Files:** Create `app/src/renderer/App.tsx`, `SetupScreen.tsx`, `StatusBar.tsx`, `modules.ts`, `staticData.ts`, `professions/ProfessionsView.tsx`, `professions/MaterialsPanel.tsx`, `styles.css`; tests `professions/ProfessionsView.test.tsx`, `SetupScreen.test.tsx` (jsdom).

**Interfaces:**
- `staticData.ts`: `getProfessionData(name: string): ProfessionData | undefined` (from `import.meta.glob('../../../data/professions/*.json', { eager: true })`, keyed by `profession`).
- `modules.ts`: `interface ModuleDef { id: string; label: string; Component: React.FC<{ snapshot: TrackerSnapshot; now: number }> }`; `modules: ModuleDef[] = [{ id: 'professions', label: 'Profese', Component: ProfessionsView }]`.
- `SetupScreen` props: `{ state: AppState; onChooseDir(): void; onSelectAccount(a: string): void }`. Reason texts: `missing-dir` → `Složka neexistuje.`, `missing-wtf` → `Ve složce chybí WTF – vyber složku, kde jsou Interface a WTF.`, `no-accounts` → `Ve složce WTF/Account není žádný účet – přihlas se jednou do hry.`
- `ProfessionsView`: left list of characters (name, level, class) → professions with `skill/maxSkill`; main area: sections `Umím`, `Můžu se naučit teď`, `Po dalším skillupu`, `Neznámé recepty`; each row with a colored difficulty dot and source. If `scanned` false → text `Otevři okno profese ve hře a dej /reload.` instead of `Umím`. Clicking a recipe opens `MaterialsPanel` with a quantity input (default 1) feeding `multiplier`; each row shows `name needed / total` and sources like `Thrall – taška 4`, `Thrall – banka 8 (před 4 dny)`, `Banka účtu 20`; stale sources get class `stale`. Gathering professions (no static data and no recipes) show only skill.
- Settings: a gear button in the header shows current game folder and account with buttons `Změnit složku` and (if >1 account) account select.

- [ ] **Step 1:** Tests:
  - ProfessionsView with fixture snapshot: shows `Thrall` and `Jaina`; selecting Thrall → Alchemy shows `142/150`; section `Po dalším skillupu` contains `Elixir of Wisdom`; clicking `Minor Healing Potion` shows `Peacebloom` with `1 / 32` and a `.stale` element containing `banka`.
  - Herbalism selected → shows `160/225`, no recipe sections.
  - SetupScreen with `{phase:'needs-game-dir', reason:'missing-wtf'}` renders the missing-wtf text; with `needs-account` and two accounts renders both as buttons and clicking calls `onSelectAccount('ACC2')`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; dark theme suited to a second monitor, CSS variables only, no UI framework. **Step 4:** Run → PASS; `npm run dev` with fake folder, visually check. **Step 5:** Commit `feat(app): setup screen and Professions module UI`.

### Task 8: In-game addon

**Files:** Create `addon/AzerothTracker/AzerothTracker.toc`, `AzerothTracker.lua`, `addon/README.md`.

**Interfaces:** Writes exactly the SavedVariables format above.

- [ ] **Step 1:** `.toc`: `## Interface: 11507` (update after launch to `select(4, GetBuildInfo())` value shown in game), `## Title: AzerothTracker`, `## SavedVariables: AzerothTrackerDB`, `AzerothTracker.lua`.
- [ ] **Step 2:** Implement in Lua 5.1 (WoW Classic API):
  - init DB on `ADDON_LOADED` (create tables, `schemaVersion = 1`); character key `GetRealmName() .. "-" .. UnitName("player")`.
  - `PLAYER_LOGIN`, `PLAYER_LEVEL_UP`, `SKILL_LINES_CHANGED`: basic info + professions via `GetNumSkillLines`/`GetSkillLineInfo` (keep only profession headers' children: primary + secondary professions); preserve existing `recipes`/`scannedAt`.
  - `TRADE_SKILL_SHOW`/`TRADE_SKILL_UPDATE`: `GetTradeSkillLine`, iterate `GetNumTradeSkills`/`GetTradeSkillInfo` (skip `header`), reagents via `GetTradeSkillNumReagents`, `GetTradeSkillReagentInfo`, `GetTradeSkillReagentItemLink` → itemId. `CRAFT_SHOW`/`CRAFT_UPDATE`: same with `GetCraft*` (Enchanting). Replace the profession's `recipes` wholesale, set `scannedAt = time()`.
  - `BAG_UPDATE_DELAYED` (fallback `BAG_UPDATE` throttled 1 s): bags 0–4 via `C_Container.GetContainerItemInfo` if present else `GetContainerItemInfo`; record `itemNames`.
  - `BANKFRAME_OPENED`, `PLAYERBANKSLOTS_CHANGED`: bank container -1 and bags 5–11.
  - account bank: if `Enum.BagIndex.AccountBankTab_1` (or equivalent) exists, scan on its open event; otherwise skip silently.
  - `/at` slash command prints counts (characters, recipes) for debugging.
  - Every API call guarded so a missing function does not error (`if GetCraftInfo then`).
- [ ] **Step 3:** If `luac`/`lua5.1` available: `luac -p addon/AzerothTracker/AzerothTracker.lua` → no output. Otherwise run it through `luaparse` in a small node script `app/scripts/check-addon.mjs` (`npm run check:addon`) → exit 0.
- [ ] **Step 4:** `addon/README.md`: copy to `<gameDir>\Interface\AddOns\AzerothTracker\`, log in, open each profession window, open bank, `/reload`. Manual test checklist after 4. 11.: file appears, matches format, app shows data.
- [ ] **Step 5:** Commit `feat(addon): collect professions and inventory`.

### Task 9: CI and Windows release

**Files:** Create `.github/workflows/ci.yml`, `.github/workflows/release.yml`.

- [ ] **Step 1:** `ci.yml`: on push/PR; `ubuntu-latest`; Node 22; `working-directory: app`; `npm ci`, `npm run typecheck`, `npm test`, `npm run check:addon`; plus step `! git grep -il fykee -- app addon data .github`.
- [ ] **Step 2:** `release.yml`: on tag `v*`; `windows-latest`; Node 22; `npm ci`, `npm test`, `npm run dist:win`; zip `addon/AzerothTracker` → `AzerothTracker-addon-<tag>.zip`; publish both to a GitHub Release with `softprops/action-gh-release` (`permissions: contents: write`).
- [ ] **Step 3:** Validate YAML (`npx yaml-lint` or `actionlint` if available). Commit `ci: tests and Windows release`.
- [ ] **Step 4:** After the user pushes: confirm CI green; user tags `v0.1.0` → release contains `AzerothTracker-0.1.0.exe` and the addon zip.
