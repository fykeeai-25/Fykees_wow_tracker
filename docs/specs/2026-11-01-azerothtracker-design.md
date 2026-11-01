# AzerothTracker – skeleton design (v1: Professions module)

Date: 2026-11-01
Status: approved, v1 implemented (English UI since 2026-11-01)

## Goal

A companion app for **World of Warcraft: Forever** in the style of AlecaFrame (Warframe).
It runs as a separate window on a second monitor, with no in-game overlay. It moves the
features of addons such as GearQuest Forever, Mastercraft, DungeonJournal and What's
Training out of the game. It is for personal use and a few friends; everyone runs it
locally.

The first version has a single module: **Professions** (inspired by Mastercraft). More
modules will be added depending on what the game looks like after launch (2026-11-04).

## Naming and language

- The app, the addon and the data are all called **AzerothTracker**.
- The GitHub repo name (`Fykees_wow_tracker`) never appears inside the app.
- Everything is in English: UI, addon messages, docs.

## Environment

- **Development:** macOS. Tests run against sample SavedVariables files; the game is not needed.
- **Runtime:** the Windows PC the game is played on. GitHub Actions (`windows-latest`) builds
  the Windows app; the `.exe` and a zip of the addon are published in GitHub Releases. The
  gaming PC needs neither Node nor git.

## Architecture

### A) Addon `AzerothTracker` (Lua, in game)

- Files: `addon/AzerothTracker/AzerothTracker.toc`, `AzerothTracker.lua`.
- Saves to SavedVariables `AzerothTrackerDB`, keyed by `realm` and character.
- Collects:
  - character basics (name, realm, race, class, level),
  - professions: name, current and maximum skill,
  - learned recipes with reagents, captured when the profession window is opened,
  - bag contents; bank contents only while the bank is open,
  - the account-wide bank (if Forever has one) when it is opened; stored separately, not
    under a character.
- Stores when each part was last updated.
- Game limitation: the file is written to disk only on `/reload`, logout (including switching
  character) or quitting the game. Loading screens on zone changes do not write it.
- The file is shared by the whole WoW account, so it keeps data for every character from
  their last login.
- API function names for Forever will be verified after launch. Classic uses a different API
  for Enchanting (Craft) than for other professions (TradeSkill); the addon handles both.

### B) Desktop app (Electron + TypeScript + React)

- Tooling: electron-vite, React, TypeScript, Vitest.
- **Main process:**
  - `config`: stores the chosen game folder and account (a file in userData).
  - `savedVariablesLocator`: derives `WTF/Account/<account>/SavedVariables/AzerothTracker.lua`
    from the game folder. The app always works with one account. If the folder has several,
    the user picks one and can change it in settings. Data from several accounts is never merged.
  - `watcher`: watches the file and reloads it on change.
  - `luaParser`: turns the `AzerothTrackerDB` Lua table into JSON.
  - `normalizer`: builds the domain model (Character, Profession, Recipe, Inventory) from JSON.
  - Sends the result to the renderer over IPC.
- **Renderer (UI):**
  - A setup screen for choosing the game folder (first launch, or when the path is invalid).
  - Modules as tabs; v1 contains only the Professions tab.
  - A status bar with data freshness: "Data from /reload at HH:MM", or a warning.

### C) Static game data (`data/`)

- One JSON file per profession: recipes, reagents, skill ranges for colours (orange, yellow,
  green, grey), recipe source (trainer, vendor, drop), trainer cost.
- Sample data only until the game launches; real data will be added once servers open.

## Professions module (v1)

1. **Character overview:** every character in SavedVariables, their professions and skill (e.g. 142/150).
2. **Recipes:** known, learnable now, and learnable after the next skill-up, with a
   difficulty colour based on the current skill.
3. **Materials across characters:** for the selected recipe, how much of each reagent is
   needed and how much is available in total, broken down by source: character × (bags /
   bank) and the account bank. Each source shows when it was last seen.
   Example: "Peacebloom 12 = Thrall bags 4 + Alt bank 8 (seen yesterday 21:14)".
   Sources older than 3 days are marked as possibly outdated. Characters whose bank was never
   seen are listed ("Bank not scanned yet").

## Errors and edge cases

- The game folder does not exist or has no `WTF`: show the setup screen.
- SavedVariables file is missing (the addon has not written anything yet): show
  "install the addon, log in and type /reload".
- The file cannot be read (damaged or being written): keep the last good data and show a
  warning. Retry on the next file change.
- A recipe missing from static data: show it with the addon's data and mark it "unknown".

## Repository layout

```
addon/AzerothTracker/   addon (.toc, .lua)
app/                    Electron app
data/                   static game data (JSON)
docs/specs/             specifications
docs/plans/             implementation plans
.github/workflows/      CI and Windows release
```

## Testing

- Vitest: `luaParser`, `normalizer`, `savedVariablesLocator` and the Professions logic
  (what is learnable, colours, materials) against sample files in `app/test/fixtures/`.
- Addon: an automated contract test runs the addon against a mocked WoW API in CI; a manual
  in-game test follows the launch (2026-11-04). If the API differs, both the addon and the
  sample data are updated.
- CI: tests run in GitHub Actions on every push and before every build.

## Out of scope for v1

Gear, Dungeons and Trainer modules; profession levelling planner; auction prices (the
Blizzard API for Forever is uncertain and auction addons require a manual scan at the
auction house); Blizzard API; installing the addon from the app; automatic app updates;
running the app on macOS as a product.
