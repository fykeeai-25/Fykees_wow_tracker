const KNOWN: Record<string, string> = { "Merchant's Favor": 'MF' }

/** Short label for the narrow character column, e.g. Merchant's Favor → MF. */
export function abbreviateCurrency(name: string): string {
  return (
    KNOWN[name] ??
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase())
      .join('')
  )
}
