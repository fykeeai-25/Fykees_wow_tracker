# AzerothTracker – pre-launch package design

Date: 2026-11-01
Status: draft for review
Builds on: `2026-11-01-azerothtracker-design.md` (v1, Professions)
Deadline: before WoW: Forever launches (2026-11-04)

## Goal

Make the v1 skeleton ready for launch day: a stable addon data format, game data that
updates without a new `.exe`, a clearer UI on the second monitor, and reproducible builds.
No new modules.

## Product rules (apply to all future work)

- **No Windows/OS notifications, ever.** Anything that needs attention is shown only inside
  the app window (e.g. a highlighted row or a small in-app indicator).
- Everything is in English. The repo name never appears in the UI.
- Wowhead is used manually (verifying data, filling gaps) and as outbound links. The app and
  scripts never scrape it (Wowhead terms forbid automated scraping).

## 1. Addon data format v2

- `schemaVersion = 2`. Nobody has v1 data yet (game not launched), so the app accepts only 2.
- Recipes are keyed by **spell ID** when the game provides one (`GetTradeSkillRecipeLink` /
  Craft equivalent), otherwise by name. Each recipe stores
  `{ spellId?, name, createdItemId?, numMade?, difficulty, reagents }`.
  `difficulty` is the game's own colour (`optimal`→orange, `medium`→yellow, `easy`→green,
  `trivial`→gray) at scan time.
- If any reagent link is missing (item not yet cached), the recipe is **not** overwritten;
  the previous entry is kept and the scan is retried on the next update.
- Profession-window rescans are throttled (at most once per 0.5 s).
- The app matches known recipes to static data by `spellId` first, then by name.
- If the file's `schemaVersion` is higher than the app supports, the app shows
  "The addon is newer than the app – please update AzerothTracker." instead of the generic
  warning.

## 2. Game data pack (fetched at startup)

- Static game data leaves the renderer bundle and becomes one **data pack**:
  `data-pack.json = { manifest: { dataSchema: 1, dataVersion, generatedAt }, items, professions }`.
- Source files stay in `data/` (`data/items.json`, `data/professions/<slug>.json`).
  `tools/build-data-pack.mjs` validates them and writes the pack. Validation fails the build on:
  missing item names for referenced items, duplicate spell IDs, `learnAt ≤ yellow ≤ green ≤ gray`
  violated, unknown `source.type`.
- **Publishing:** a GitHub Actions workflow runs on pushes to `main` that change `data/`.
  It builds the pack (`dataVersion` = workflow run number) and uploads `data-pack.json` and
  `data-pack.json.sha256` to a release tagged `data-latest` (replacing the previous assets).
- **In the app (main process):**
  1. A bundled copy of the pack ships with the `.exe` (electron-builder `extraResources`).
  2. A downloaded copy lives in `userData/data-pack.json`.
  3. At startup the app uses the newest valid copy it has, then fetches the release asset over
     HTTPS (public repo, no auth). If the remote `dataVersion` is higher, the same `dataSchema`
     major, and the SHA-256 matches, it saves it and switches to it. Otherwise nothing changes.
  4. Offline or any error: keep using what it has, silently. A failed check is shown only as a
     tooltip on the data version in the status bar.
- The renderer gets static data over IPC (`data:get`, `data:changed`). The status bar shows the
  data version, e.g. `Data v12`.
- The download URL is a single constant in the main process; it is never shown in the UI.
- Update mode: **automatic and silent** (chosen by the owner).

## 3. UI quick wins

- Base font 15px, tabular numbers for counts.
- Selected recipe row: solid background + gold left bar.
- Character list: name in WoW class colour, second line `Lv 24 Shaman · Firemaw`.
- Difficulty: shape + colour (orange ▲, yellow ●, green ○, gray –), tooltip with the skill
  ranges, required skill shown on each row (`req. 145`). A small legend under the recipe list.
- Materials panel:
  - headline `Can craft N× · limited by <item>` (or `Can craft – missing <item>`),
  - rows `Need 3 · Have 32` with ✓/✗,
  - sources `Thrall · Bank 8 · seen 4 days ago`; stale sources get a clock icon in a muted
    colour (not orange, which means difficulty),
  - `Jaina's bank isn't scanned. Open it in game, then /reload.`
  - quantity label `Craft ×`.
- Status bar: `Updated 11:06 · 4 min ago`; after 30 min it turns amber with
  `Last /reload 2 h ago`; plus the data version.
- Settings move into a popover from the gear button.
- Window: remembers position/size per display, `minWidth 640`, an always-on-top pin toggle
  (off by default, remembered).
- Wowhead links: a small ↗ next to recipes and materials opens the Wowhead page in the default
  browser (`shell.openExternal`, only `https://www.wowhead.com/` URLs allowed). The exact
  Forever URL path is confirmed at implementation; the base URL is one constant.
- Copy: `Next skill-up` → `Learnable at <skill>`, `Unknown recipes` → `Known, not in database`,
  setup texts per the UX review.

## 4. Demo mode

- The setup screen gets `Try with demo data`. It points the app at a bundled demo game folder
  (`extraResources/demo/WTF/...`) so the app can be tried on Windows before launch.
  The status bar shows `Demo data` while active; `Change folder` leaves demo mode.

## 5. Build reproducibility

- A workflow generates `app/package-lock.json` (`npm install --package-lock-only`) when it is
  missing or `package.json` changed, and commits it to the branch. CI and release then use
  `npm ci`.
- The release workflow uploads the `.exe` and addon zip from `feat/**` builds as workflow
  artifacts (preview builds downloadable from the Actions page).

## Out of scope

Real game data (first week after launch, from wago.tools exports + an opt-in harvest addon +
manual overrides checked on Wowhead), responsive single-column layout, icons, new modules,
levelling planner, OS notifications (never).

## Testing

- Addon: contract test scenarios for spell-ID keys, missing reagent links (entry kept),
  difficulty mapping; app normalizer tests for schemaVersion 2 and "addon newer than app".
- Data pack: validation unit tests (each rule), build script test, loader tests (bundled vs
  downloaded vs remote newer/older/bad hash/offline) with an injected fetch.
- UI: component tests for the new materials headline, need/have rows, stale icon, unscanned
  bank text, status bar ages, selected row; screenshots via the CI renderer preview.
