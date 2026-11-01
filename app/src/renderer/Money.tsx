/** Copper amount as coloured coins, e.g. 12g 34s 56c (zero parts omitted, 0 → 0c). */
export function Money({ copper }: { copper: number }) {
  const g = Math.floor(copper / 10000)
  const s = Math.floor((copper % 10000) / 100)
  const c = copper % 100
  const parts: [number, string, string][] = [
    [g, 'g', 'gold'],
    [s, 's', 'silver'],
    [c, 'c', 'copper']
  ]
  const shown = parts.filter(([n], i) => n > 0 || (i === 2 && g === 0 && s === 0))
  return (
    <span className="money">
      {shown.map(([n, unit, cls], i) => (
        <span key={unit} className={cls}>
          {`${i > 0 ? ' ' : ''}${n.toLocaleString('en-US')}${unit}`}
        </span>
      ))}
    </span>
  )
}
