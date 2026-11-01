import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AzerothApi } from '../shared/ipc'
import type { AppState } from '../shared/types'

const api: AzerothApi = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState(cb) {
    const listener = (_e: IpcRendererEvent, s: AppState): void => cb(s)
    ipcRenderer.on(IPC.stateChanged, listener)
    return () => void ipcRenderer.removeListener(IPC.stateChanged, listener)
  },
  chooseGameDir: () => ipcRenderer.invoke(IPC.chooseGameDir),
  setAccount: (account) => ipcRenderer.invoke(IPC.setAccount, account)
}

contextBridge.exposeInMainWorld('azeroth', api)
