import type { AppState, DataState } from './types'

export const IPC = {
  getState: 'state:get',
  stateChanged: 'state:changed',
  chooseGameDir: 'config:chooseGameDir',
  setAccount: 'config:setAccount',
  getData: 'data:get',
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
}
