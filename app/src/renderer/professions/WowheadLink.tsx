export function WowheadLink({ url, label }: { url?: string; label: string }) {
  if (!url) return null
  return (
    <button
      className="wowhead"
      aria-label={`Open ${label} on Wowhead`}
      title="Open on Wowhead"
      onClick={() => void window.azeroth?.openWowhead(url)}
    >
      ↗
    </button>
  )
}
