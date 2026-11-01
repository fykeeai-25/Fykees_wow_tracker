# AzerothTracker – dashboard layout design

Date: 2026-11-01
Status: implemented 2026-11-01; approved in chat (mockup `layout.png`; answers: search hides under a magnifier below 1000 px; all bubbles are quick summaries that open a full view on click)

## Layout

```
┌ top bar: AzerothTracker · Updated 22:03 · 4 min ago · Data v5 · [🔍 when narrow] · ⚙ ┐
│ Characters (fixed)  │ Bubbles (summary cards / one full view)  │ Find item… + results │
│ icon  Thrall        │ ┌ Professions ───────────────┐            │                      │
│ Lv 24 · 12g · MF 7  │ │ Alchemy 142/150 ███▌ …      │            │                      │
│ seen just now       │ └─────────────────────────────┘            │                      │
│ …                   │                                            │                      │
│ Total 496g · MF 22  │                                            │                      │
└─────────────────────┴────────────────────────────────────────────┴──────────────────────┘
```

- **Left column (fixed, ~250 px):** one compact row per character: class icon, name in class
  colour (large), then small text `Lv 24 · <gold> · MF 7` (currencies abbreviated: Merchant's
  Favor → `MF`, other currencies → their initials), then dim `seen just now`. Click selects the
  character (gold border). Footer: `Total` gold and currency sums. Replaces the Alts table.
- **Centre:** bubbles for the selected character. Each bubble shows a quick summary; clicking
  it opens the bubble's full view over the whole centre with `← Back` to return. v1 bubble:
  **Professions** – summary lists each profession with skill and a bar, plus
  `N learnable now · next at <skill>` for crafting professions with data; full view = the
  existing profession tabs, recipe lists and materials panel. Later bubbles (Legacy planner…)
  plug in the same way.
- **Right column (~290 px):** `Find item…` search with results below (existing search).
  Below 1000 px window width the column is hidden; a 🔍 button in the top bar opens it as a
  panel over the right side (Escape or 🔍 closes it).
- **Top bar:** brand, status text (`Updated … · … ago`, amber when old, `Demo data ·` prefix),
  data version, 🔍 (narrow only), ⚙ settings. The bottom status bar and the module tabs go away.

## Rules

No OS notifications; English only; existing behaviour of professions, materials, search,
settings, demo mode and data updates is unchanged.

## Testing

Component tests: character rows (info line, selection, total), Professions bubble summary
text, click → full view → Back, App: selecting a character changes the bubble content, search
panel toggle button, top bar status text. Screenshots at 1200 px and 800 px.
