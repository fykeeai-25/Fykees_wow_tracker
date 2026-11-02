# Installing AzerothTracker

For Windows. Takes about five minutes. Nothing is installed into Windows – the app runs from
the folder you unzip it to.

## 1. Download

From the [Releases](https://github.com/fykeeai-25/Fykees_wow_tracker/releases) page, take the newest release and download:

| File | What it is |
|---|---|
| `AzerothTracker-<version>-win-x64.zip` | the app |
| `AzerothTracker-addon-<version>.zip` | the in-game addon (needed – the app shows what it collects) |
| `SHA256SUMS.txt` | optional, to check the downloads (see the release notes) |

Test builds of unfinished features (including the research addon `AzerothTrackerProbe`) are
not on the Releases page: GitHub → **Actions** → **Release** → newest run → **windows-preview**
(you need to be signed in to GitHub).

## 2. Find your game folder

Battle.net → **WoW: Forever** → gear icon next to *Play* → **Show in Explorer** → open the
`_forever_` folder. It contains `Interface` and `WTF`, for example:

```
D:\Games\World of Warcraft\_forever_\
├── Interface\
│   └── AddOns\        ← the addon goes here
└── WTF\               ← the game saves the addon's data here
```

If `Interface\AddOns` does not exist yet, create both folders.

## 3. Where each file goes

| Download | Unzip to | Result |
|---|---|---|
| `AzerothTracker-addon-*.zip` | `_forever_\Interface\AddOns\` | `…\AddOns\AzerothTracker\AzerothTracker.toc` |
| `AzerothTrackerProbe-*.zip` (test build only) | `_forever_\Interface\AddOns\` | `…\AddOns\AzerothTrackerProbe\AzerothTrackerProbe.toc` |
| `AzerothTracker-*-win-x64.zip` | any folder of your own, e.g. `Documents\AzerothTracker\` | `…\AzerothTracker\AzerothTracker.exe` |

Common mistakes:

- A doubled folder like `AddOns\AzerothTracker\AzerothTracker\….toc` – the game does not find
  it. The `.toc` file must be directly inside `AddOns\AzerothTracker\`.
- The addon in the `_retail_` or `_classic_` folder instead of `_forever_`.
- Do not put the app into the game folder, and do not run it from inside the zip.

## 4. First start in game

1. On the character screen click **AddOns** and tick **AzerothTracker**. If it says
   *out of date*, tick **Load out of date AddOns**.
2. Log in. Open each profession window once and visit the bank.
3. Type `/reload`. Only now does the game write the data to
   `WTF\Account\<account>\SavedVariables\AzerothTracker.lua`.
   (It also does so on logout and character switch.)
4. Optional: `/azeroth debug` shows the client version and anything the addon cannot read yet.

## 5. First start of the app

1. Double-click `AzerothTracker.exe`. Windows SmartScreen may warn because the app is not
   signed: **More info → Run anyway**.
2. **Choose game folder** → select the `_forever_` folder from step 2 (not `WTF` or `AddOns`).
3. If you have several WoW accounts, pick the one you play on.
4. Your characters appear. After every `/reload` or logout the app refreshes by itself.

No game yet? **Try with demo data** on the first screen.

## Updating

- App: download the new zip, unzip over the old folder (or into a new one). Your settings stay
  (they live in `%APPDATA%\AzerothTracker\`).
- Addon: delete `AddOns\AzerothTracker\` and unzip the new one. Your saved data in `WTF` stays.

## Uninstalling

Delete the app folder, `%APPDATA%\AzerothTracker\` (settings) and `Interface\AddOns\AzerothTracker\`. To remove the collected data too,
delete `WTF\Account\<account>\SavedVariables\AzerothTracker.lua`.
