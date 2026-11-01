import { app, BrowserWindow, dialog, ipcMain, net } from 'electron'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import { createTracker } from './tracker'
import { createDataStore } from './dataStore'

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

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AzerothTracker',
    backgroundColor: '#14161c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
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
