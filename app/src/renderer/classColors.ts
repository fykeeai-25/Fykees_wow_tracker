// WoW class colours (by class token from UnitClass).
const CLASS_COLORS: Record<string, string> = {
  WARRIOR: '#C69B6D',
  PALADIN: '#F48CBA',
  HUNTER: '#AAD372',
  ROGUE: '#FFF468',
  PRIEST: '#FFFFFF',
  SHAMAN: '#0070DD',
  MAGE: '#3FC7EB',
  WARLOCK: '#8788EE',
  DRUID: '#FF7C0A'
}

export const classColor = (token: string): string | undefined => CLASS_COLORS[token.toUpperCase()]

export const className = (token: string): string =>
  token ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : ''
