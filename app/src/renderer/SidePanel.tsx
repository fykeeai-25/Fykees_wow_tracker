import { createContext, useContext, type ReactNode } from 'react'

const Ctx = createContext<HTMLElement | null>(null)

/** A DOM element in the right column where detail panels (e.g. recipe materials) can render. */
export function SidePanelProvider(props: { value: HTMLElement | null; children: ReactNode }) {
  return <Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>
}

export function useSidePanel(): HTMLElement | null {
  return useContext(Ctx)
}
