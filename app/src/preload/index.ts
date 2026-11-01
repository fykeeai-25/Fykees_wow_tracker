import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AzerothApi } from '../shared/ipc'
import type { AppState, DataState } from '../shared/types'

const api: AzerothApi = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState(cb) {
    const listener = (_e: IpcRendererEvent, s: AppState): void => cb(s)
    ipcRenderer.on(IPC.stateChanged, listener)
    return () => void ipcRenderer.removeListener(IPC.stateChanged, listener)
  },
  chooseGameDir: () => ipcRenderer.invoke(IPC.chooseGameDir),
  setAccount: (account) => ipcRenderer.invoke(IPC.setAccount, account),
  getData: () => ipcRenderer.invoke(IPC.getData),
  getWindowPrefs: () => ipcRenderer.invoke(IPC.getWindowPrefs),
  setAlwaysOnTop: (on) => ipcRenderer.invoke(IPC.setAlwaysOnTop, on),
  openWowhead: (url) => ipcRenderer.invoke(IPC.openWowhead, url),
  onData(cb) {
    const listener = (_e: IpcRendererEvent, s: DataState): void => cb(s)
    ipcRenderer.on(IPC.dataChanged, listener)
    return () => void ipcRenderer.removeListener(IPC.dataChanged, listener)
  }
}

contextBridge.exposeInMainWorld('azeroth', api)
