# Addon AzerothTracker

Sbírá ve hře data pro aplikaci AzerothTracker a ukládá je do SavedVariables
(`AzerothTrackerDB`).

## Instalace

1. Zkopíruj složku `AzerothTracker` do `<složka hry>\Interface\AddOns\`
   (tedy `<složka hry>\Interface\AddOns\AzerothTracker\AzerothTracker.toc`).
2. Ve výběru postav zapni addon v **AddOns**. Pokud hlásí „zastaralý",
   zaškrtni **Load out of date AddOns**.
3. Ve hře otevři okno každé profese (bez filtrů a hledání) a zajdi do banky.
4. Dej `/reload` – teprve tehdy hra zapíše data na disk (zapisuje je také při
   odhlášení a přepnutí postavy).

Příkaz `/azeroth` (nebo `/at`) vypíše, kolik dat addon zatím nasbíral.

## Ruční test po vydání hry (4. 11.)

- [ ] V `/dump select(4, GetBuildInfo())` zjistit číslo rozhraní a dát ho do `## Interface:` v `.toc`.
- [ ] Po `/reload` existuje `WTF\Account\<účet>\SavedVariables\AzerothTracker.lua`.
- [ ] Soubor odpovídá formátu z plánu (schemaVersion 1): postava, profese se skillem, recepty, tašky, banka.
- [ ] Enchanting (Craft API) se zapisuje stejně jako ostatní profese.
- [ ] Pokud má Forever banku účtu, objeví se `accountBank`.
- [ ] Aplikace data zobrazí a po dalším `/reload` se sama obnoví.
