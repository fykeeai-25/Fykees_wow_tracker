# AzerothTracker addon

Collects data in game for the AzerothTracker app and saves it to SavedVariables
(`AzerothTrackerDB`).

## Install

1. Copy the `AzerothTracker` folder into `<game folder>\Interface\AddOns\`
   (so you get `<game folder>\Interface\AddOns\AzerothTracker\AzerothTracker.toc`).
2. Enable the addon under **AddOns** on the character screen. If it says "out of date",
   tick **Load out of date AddOns**.
3. In game, open each profession window and visit the bank.
4. Type `/reload` – only then does the game write the data to disk (it also does so on
   logout and when switching characters).

`/azeroth` (or `/at`) prints how much data the addon has collected so far.

## Manual test after launch (2026-11-04)

- [ ] Run `/dump select(4, GetBuildInfo())` and put the interface number into `## Interface:` in the `.toc`.
- [ ] After `/reload`, `WTF\Account\<account>\SavedVariables\AzerothTracker.lua` exists.
- [ ] The file matches the format in the plan (schemaVersion 1): character, professions with skill, recipes, bags, bank.
- [ ] `/dump TRADE_SKILLS, SECONDARY_SKILLS` – does it match the headers in the skills window (Professions / Secondary Skills)?
- [ ] Collapse a category in the profession window, `/reload` – the recipes are still in the app.
- [ ] Enchanting (Craft API) is saved like the other professions.
- [ ] If Forever has an account bank, `accountBank` appears.
- [ ] The app shows the data and refreshes by itself after the next `/reload`.
