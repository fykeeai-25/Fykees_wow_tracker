# WoW: Forever – finding out what the client really offers

Goal: build the **Run history** module (and fix the existing addon where needed) on what the
Forever client actually provides, not on guesses. Do this once the client is installed;
the steps work before the servers open (1–2) and after (3).

## What we know so far (web research, 2026-11-02)

- Forever shares Mainline WoW's UI architecture and most of the 12.1.5 API, with the same
  addon restrictions as Midnight. Classic Era addons do not load as they are.
- Other Forever addons use `## Interface: 16001` (client 1.60.x) – **unverified**, confirm with step 2.
- Combat-log based tracking may be unavailable or restricted. We do not use it anyway (fair play).
- Consequence for AzerothTracker: the main addon was written against the Classic Era API
  (`GetTradeSkillInfo`, `GetContainerItemInfo`, …). Some of it may be missing on Forever –
  `/azeroth debug` lists exactly which functions are missing.

## 1. Export the client's own API documentation (on the game PC)

The Mainline client can export its own interface files, which include generated API
documentation (`Blizzard_APIDocumentationGenerated`).

1. Battle.net → WoW: Forever → gear icon → **Game Settings** → tick **Additional command line
   arguments** and enter `-console`.
2. Start the game. On the login screen press the **`** key (left of `1`) to open the console.
3. Type `exportInterfaceFiles code` and press Enter. Wait until it finishes.
4. The files appear in the game folder under `_forever_\BlizzardInterfaceCode\`.
5. Remove `-console` again afterwards.

**Do not commit these files to our repository** – they are Blizzard's code (CLAUDE.md:
no third-party code). Keep them on your PC. Useful things to look up there:

- `Blizzard_APIDocumentationGenerated\*.lua` – every C_ namespace, function and event with
  its arguments. Search for `ENCOUNTER_END`, `GetInstanceInfo`, `C_Container`, `C_TradeSkillUI`.
- Note the findings in our own words in `docs/specs/` (names of functions and events are fine).

## 2. Quick checks in game (any character)

| Command | Tells us |
|---|---|
| `/dump select(4, GetBuildInfo())` | interface number for the `.toc` files |
| `/api` | in-game API browser; e.g. `/api encounter` lists matching functions and events |
| `/azeroth debug` | which functions the main addon needs but the client lacks |
| `/atprobe` | probe status, number of logged events, events the client does not know |

## 3. Record a real dungeon run with the probe addon

`AzerothTrackerProbe` is a temporary research addon (separate from the main addon). It logs
instance-related events into `WTF\Account\<account>\SavedVariables\AzerothTrackerProbe.lua`.

1. Download `AzerothTrackerProbe-*.zip` from the latest build (GitHub → Actions → Release →
   **windows-preview** artifact), extract into `_forever_\Interface\AddOns\`.
2. Enable it on the character screen (tick **Load out of date AddOns** if needed).
3. Run a full dungeon. If possible: once complete, once leaving halfway.
4. `/reload` (or log out), then send us `AzerothTrackerProbe.lua`.

What it records: entering/leaving an instance (name, type, difficulty, instance ID, group
size, time inside), encounter start/end and boss kills, your deaths, XP and gold gained,
**your own** loot, dungeon-finder / scenario completion events, and which events or APIs the
client does not have. Values the client hides from addons are stored as `<secret>`.

What it never records: the combat log, other players' names, classes or loot.

`/atprobe clear` empties the log.

## Questions the run should answer

- [ ] Does `ENCOUNTER_END` fire for dungeon bosses, with `success = 1` on a kill?
- [ ] Does `BOSS_KILL` fire? Does `LFG_COMPLETION_REWARD` or `SCENARIO_COMPLETED` fire at the end?
- [ ] Is `instanceId` stable between two runs of the same dungeon?
- [ ] Is loot text readable in instances or `<secret>`?
- [ ] Interface number for both `.toc` files.
