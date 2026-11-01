import type { AppState, DataState } from './types'
import type { WindowPrefs } from '../main/windowState'

export const IPC = {
  getState: 'state:get',
  stateChanged: 'state:changed',
  chooseGameDir: 'config:chooseGameDir',
  setAccount: 'config:setAccount',
  getData: 'data:get',
  getWindowPrefs: 'window:getPrefs',
  setAlwaysOnTop: 'window:setAlwaysOnTop',
  openWowhead: 'shell:openWowhead',
  dataChanged: 'data:changed'
} as const

/** API exposed by the preload script as window.azeroth */
export interface AzerothApi {
  getState(): Promise<AppState>
  onState(cb: (s: AppState) => void): () => void
  chooseGameDir(): Promise<void>
  setAccount(account: string): Promise<void>
  getData(): Promise<DataState>
  onData(cb: (s: DataState) => void): () => void
  getWindowPrefs(): Promise<WindowPrefs>
  setAlwaysOnTop(on: boolean): Promise<void>
  openWowhead(url: string): Promise<void>
}
