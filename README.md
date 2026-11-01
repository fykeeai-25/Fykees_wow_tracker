# AzerothTracker

A companion app for **World of Warcraft: Forever** in the style of AlecaFrame. It runs as a
separate window on a second monitor (Windows) and reads the data that the AzerothTracker
addon collects in game.

- Design: [`docs/specs/2026-11-01-azerothtracker-design.md`](docs/specs/2026-11-01-azerothtracker-design.md)
- Plan: [`docs/plans/2026-11-01-azerothtracker-v1.md`](docs/plans/2026-11-01-azerothtracker-v1.md)

## Layout

```
addon/AzerothTracker/   in-game addon
app/                    Electron app
data/                   static game data (JSON)
```

## Development

```bash
cd app
npm install
npm run dev        # start the app
npm test           # tests (Vitest)
npm run typecheck
```

Tests run automatically in GitHub Actions on every push. Pushing a `v*` tag builds the
Windows app (`AzerothTracker-<version>.exe`) and the addon zip and publishes them as a
GitHub Release.
