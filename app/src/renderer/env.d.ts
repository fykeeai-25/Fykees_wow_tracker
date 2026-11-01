import type { AzerothApi } from '../shared/ipc'

declare global {
  interface Window {
    azeroth: AzerothApi
  }
}

export {}
