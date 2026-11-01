/** Wowhead pages for WoW: Forever. Opened in the user's browser; never fetched by the app. */
export const WOWHEAD_BASE = 'https://www.wowhead.com/forever/'

export function wowheadItemUrl(id: number): string {
  return `${WOWHEAD_BASE}item=${id}`
}

export function wowheadSpellUrl(id: number): string {
  return `${WOWHEAD_BASE}spell=${id}`
}

export function isWowheadUrl(url: string): boolean {
  return url.startsWith('https://www.wowhead.com/')
}
