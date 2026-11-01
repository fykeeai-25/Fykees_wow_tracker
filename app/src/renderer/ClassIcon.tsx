import { CLASS_BADGE_COLORS, CLASS_SYMBOLS } from './classIcons'

export const CLASS_TOKENS = Object.keys(CLASS_SYMBOLS)

const INK = '#1b1d24'

/** Round badge with a cartoon class symbol; unknown classes get a "?". */
export function ClassIcon({ token, size = 32 }: { token: string; size?: number }) {
  const key = token.toUpperCase()
  const symbol = CLASS_SYMBOLS[key]
  const label = symbol ? `${key.charAt(0)}${key.slice(1).toLowerCase()} icon` : 'Unknown class icon'
  return (
    <svg className="class-icon" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={label}>
      <circle cx="16" cy="16" r="15" fill={CLASS_BADGE_COLORS[key] ?? '#6b7080'} stroke={INK} strokeWidth="1.6" />
      <circle cx="16" cy="16" r="13.9" fill="none" stroke="#2a2f3a" strokeWidth="1.3" />
      <circle cx="16" cy="16" r="12.6" fill="rgba(0,0,0,0.22)" />
      <path d="M5.6 12.2 A10.8 10.8 0 0 1 12.4 5.4" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      {symbol ? (
        // static markup from classIcons.ts (no user input)
        <g data-symbol dangerouslySetInnerHTML={{ __html: symbol }} />
      ) : (
        <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff6df">
          ?
        </text>
      )}
    </svg>
  )
}
