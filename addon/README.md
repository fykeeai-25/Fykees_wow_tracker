# AzerothTracker addon

Collects data about **your own characters** for the AzerothTracker app and saves it to
SavedVariables (`AzerothTrackerDB`). It only reads (through the official addon API) and never
acts in the game, never uses combat data and never collects data about other players.

## What it records

| Data | When |
|---|---|
| Name, realm, race, class, level | login, level-up, logout |
| Professions and skill | login, skill changes |
| Learned recipes (spell ID, reagents, difficulty colour) | when a profession window is open |
| Bag contents | login, bag changes, logout |
| Bank contents (and account bank, if the game has one) | while the bank is open |
| Gold and currencies | login, changes, logout |
| Item names of items it has seen | together with the above |

## Install

1. Copy the `AzerothTracker` folder into `<game folder>\Interface\AddOns\`
   (so you get `<game folder>\Interface\AddOns\AzerothTracker\AzerothTracker.toc`).
2. Enable the addon under **AddOns** on the character screen. If it says "out of date",
   tick **Load out of date AddOns**.
3. In game, open each profession window and visit the bank.
4. Type `/reload` – only then does the game write the data to disk (it also does so on
   logout and when switching characters).

`/azeroth` (or `/at`) prints how much data the addon has collected so far.
`/azeroth debug` prints the client build, any WoW API functions the addon needs but the client
lacks, and any Legacy-related API names it found. The same information appears in the app under
⚙ → Game client after a `/reload`.

## Manual test after launch (2026-11-04)

- [ ] Run `/azeroth debug`: note the interface number (put it into `## Interface:` in the `.toc`), the missing APIs (should be none) and the Legacy APIs found (input for the Legacy bubble).
- [ ] After `/reload`, `WTF\Account\<account>\SavedVariables\AzerothTracker.lua` exists.
- [ ] The file matches the format in the plan (schemaVersion 1): character, professions with skill, recipes, bags, bank.
- [ ] `/dump TRADE_SKILLS, SECONDARY_SKILLS` – does it match the headers in the skills window (Professions / Secondary Skills)?
- [ ] Collapse a category in the profession window, `/reload` – the recipes are still in the app.
- [ ] Enchanting (Craft API) is saved like the other professions.
- [ ] If Forever has an account bank, `accountBank` appears.
- [ ] The app shows the data and refreshes by itself after the next `/reload`.
