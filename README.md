# AzerothTracker

Companion aplikace pro **World of Warcraft: Forever** ve stylu AlecaFrame. Běží jako
samostatné okno na druhém monitoru (Windows) a čte data, která ve hře sbírá addon
AzerothTracker.

- Návrh: [`docs/specs/2026-11-01-azerothtracker-design.md`](docs/specs/2026-11-01-azerothtracker-design.md)
- Plán: [`docs/plans/2026-11-01-azerothtracker-v1.md`](docs/plans/2026-11-01-azerothtracker-v1.md)

## Struktura

```
addon/AzerothTracker/   addon do hry
app/                    Electron aplikace
data/                   statická herní data (JSON)
```

## Vývoj

```bash
cd app
npm install
npm run dev        # spustí aplikaci
npm test           # testy (Vitest)
npm run typecheck
```

Testy běží automaticky v GitHub Actions při každém pushi.
