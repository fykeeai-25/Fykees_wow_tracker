# AzerothTracker – návrh kostry (v1: modul Profese)

Datum: 2026-11-01
Stav: návrh ke schválení

## Cíl

Companion aplikace pro **World of Warcraft: Forever** ve stylu AlecaFrame (Warframe).
Běží jako samostatné okno na druhém monitoru, bez overlaye ve hře. Funkce addonů
(GearQuest Forever, Mastercraft, DungeonJournal, What's Training) přenáší mimo hru.
Aplikace je pro osobní použití a pro pár přátel, každý ji spouští lokálně u sebe.

První verze obsahuje jediný modul: **Profese** (inspirace Mastercraft). Další moduly
se přidají podle toho, jak hra po vydání (4. 11. 2026) skutečně vypadá.

## Pojmenování

- Aplikace, addon i data se jmenují **AzerothTracker**.
- Název GitHub repa (`Fykees_wow_tracker`) se v aplikaci nikde neobjevuje.

## Prostředí

- **Vývoj:** macOS. Testuje se nad ukázkovými soubory SavedVariables, hra k tomu není potřeba.
- **Běh:** Windows PC, na kterém se hraje. Windows build vytváří GitHub Actions
  (runner `windows-latest`) a výsledné `.exe` je ke stažení v GitHub Releases spolu
  se zipem addonu. Na herním PC není potřeba Node ani git.

## Architektura

### A) Addon `AzerothTracker` (Lua, ve hře)

- Soubory: `addon/AzerothTracker/AzerothTracker.toc`, `AzerothTracker.lua`.
- Ukládá do SavedVariables `AzerothTrackerDB`, data jsou klíčovaná podle `realm` a `postava`.
- Sbírá:
  - základní info o postavě (jméno, realm, rasa, třída, level),
  - profese: název, aktuální a maximální skill,
  - naučené recepty včetně materiálů; zachytí je při otevření okna profese,
  - obsah tašek; obsah banky jen při otevřené bance.
- Ukládá i čas poslední aktualizace každé části.
- Omezení hry: soubor se na disk zapisuje jen při `/reload`, odhlášení nebo ukončení hry.
- Názvy API funkcí pro Forever se ověří po vydání. Classic používá pro Enchanting
  jiné API (Craft) než pro ostatní profese (TradeSkill), addon musí zvládnout obě.

### B) Desktopová aplikace (Electron + TypeScript + React)

- Nástroje: electron-vite, React, TypeScript, Vitest.
- **Main proces:**
  - `config`: uloží zvolenou herní složku a účet (soubor v userData).
  - `savedVariablesLocator`: z herní složky odvodí cestu
    `WTF/Account/<účet>/SavedVariables/AzerothTracker.lua`. Když najde víc účtů, nabídne výběr.
  - `watcher`: sleduje soubor a při změně ho znovu načte.
  - `luaParser`: převede Lua tabulku `AzerothTrackerDB` na JSON.
  - `normalizer`: z JSON vytvoří doménový model (Character, Profession, Recipe, Inventory).
  - Výsledek posílá do rendereru přes IPC.
- **Renderer (UI):**
  - Úvodní obrazovka pro výběr herní složky (při prvním spuštění nebo když cesta neplatí).
  - Navigace po modulech jako záložky; v1 obsahuje jen záložku Profese.
  - Lišta se stavem dat: „Data z /reload v HH:MM", případně varování.

### C) Statická herní data (`data/`)

- JSON soubory na profesi: recepty, potřebné materiály, rozsahy skillu pro barvy
  (oranžová, žlutá, zelená, šedá), zdroj receptu (trenér, vendor, drop), cena u trenéra.
- Do vydání hry jen ukázková data. Skutečná data se doplní po otevření serverů.

## Modul Profese (v1)

1. **Přehled postav:** všechny postavy z SavedVariables, jejich profese a skill (např. 142/150).
2. **Recepty:** naučené, dostupné hned a dostupné po nejbližším zvýšení skillu,
   s barvou obtížnosti podle aktuálního skillu.
3. **Materiály:** u vybraného receptu kolik čeho je potřeba a kolik toho má postava
   v taškách a bance (s časem, kdy byla banka naposledy viděna).

## Chyby a okrajové stavy

- Herní složka neexistuje nebo v ní chybí `WTF`: zobrazí se úvodní obrazovka s výběrem.
- Soubor SavedVariables chybí (addon ještě nic nezapsal): návod „nainstaluj addon,
  přihlas se a dej /reload".
- Soubor nejde načíst (poškozený nebo zrovna zapisovaný): zůstane poslední dobrý stav
  a zobrazí se varování. Při další změně souboru se načtení zkusí znovu.
- Recept, který není ve statických datech: zobrazí se s údaji z addonu a označením „neznámý".

## Struktura repa

```
addon/AzerothTracker/   addon (.toc, .lua)
app/                    Electron aplikace
data/                   statická herní data (JSON)
docs/specs/             specifikace
docs/plans/             plány implementace
.github/workflows/      Windows build a release
```

## Testování

- Vitest: `luaParser`, `normalizer`, `savedVariablesLocator` a logika Profesí
  (co je dostupné, barvy, materiály) nad ukázkovými soubory v `app/test/fixtures/`.
- Addon: ruční test ve hře po vydání (4. 11.). Výstup addonu musí odpovídat formátu
  ukázkových souborů. Pokud se API liší, upraví se addon i ukázková data.
- CI: testy běží v GitHub Actions při každém pushi a před každým buildem.

## Mimo rozsah v1

Moduly Výbava, Dungeony a Trenér; plánovač levelování profese; ceny z aukce;
Blizzard API; automatická instalace addonu z aplikace; automatické aktualizace aplikace;
podpora macOS pro běh aplikace.
