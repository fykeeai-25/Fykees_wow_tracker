import type { AppState } from '../shared/types'

export interface SetupScreenProps {
  state: AppState
  onChooseDir(): void
  onSelectAccount(account: string): void
}

export function SetupScreen(_props: SetupScreenProps) {
  return null
}
