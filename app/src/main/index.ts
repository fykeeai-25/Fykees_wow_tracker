import { app, BrowserWindow, dialog, ipcMain, net, screen, shell } from 'electron'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import { createTracker } from './tracker'
import { createDataStore } from './dataStore'
import { readWindowPrefs, visibleBounds, writeWindowPrefs } from './windowState'
import { isWowheadUrl } from '../shared/wowhead'

let win: BrowserWindow | undefined

const tracker = createTracker({
  configFile: join(app.getPath('userData'), 'config.json'),
  onState: (s) => win?.webContents.send(IPC.stateChanged, s)
})

const resourcesDir = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')

const dataStore = createDataStore({
  bundledFile: join(resourcesDir, 'data-pack.json'),
  userFile: join(app.getPath('userData'), 'data-pack.json'),
  fetchText: async (url, signal) => {
    const res = await net.fetch(url, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
  },
  onChange: (s) => win?.webContents.send(IPC.dataChanged, s)
})

const prefsFile = join(app.getPath('userData'), 'window.json')

function createWindow(): void {
  const prefs = readWindowPrefs(prefsFile)
  const bounds = visibleBounds(
    prefs.bounds,
    screen.getAllDisplays().map((d) => d.workArea)
  )
  win = new BrowserWindow({
    ...(bounds ?? { width: 1100, height: 800 }),
    alwaysOnTop: prefs.alwaysOnTop,
    minWidth: 640,
    minHeight: 480,
    title: 'AzerothTracker',
    backgroundColor: '#14161c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.on('close', () => {
    if (win) writeWindowPrefs(prefsFile, { bounds: win.getBounds(), alwaysOnTop: win.isAlwaysOnTop() })
  })
  win.on('closed', () => (win = undefined))
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle(IPC.getState, () => tracker.getState())
ipcMain.handle(IPC.getData, () => dataStore.get())
ipcMain.handle(IPC.getWindowPrefs, () => ({ ...readWindowPrefs(prefsFile), alwaysOnTop: win?.isAlwaysOnTop() ?? false }))
ipcMain.handle(IPC.setAlwaysOnTop, (_e, on: boolean) => {
  win?.setAlwaysOnTop(on)
  writeWindowPrefs(prefsFile, { ...readWindowPrefs(prefsFile), alwaysOnTop: on })
})
ipcMain.handle(IPC.openWowhead, (_e, url: string) => {
  if (isWowheadUrl(url)) return shell.openExternal(url)
})
ipcMain.handle(IPC.chooseGameDir, async () => {
  const res = await dialog.showOpenDialog({
    title: 'Choose the game folder (contains Interface and WTF)',
    properties: ['openDirectory']
  })
  if (!res.canceled && res.filePaths[0]) tracker.setGameDir(res.filePaths[0])
})
ipcMain.handle(IPC.setAccount, (_e, account: string) => tracker.setAccount(account))

app.whenReady().then(() => {
  tracker.start()
  createWindow()
  // Silent update check; failures only show up as a tooltip on the data version.
  void dataStore.refresh()
})
app.on('window-all-closed', () => {
  tracker.stop()
  app.quit()
})
