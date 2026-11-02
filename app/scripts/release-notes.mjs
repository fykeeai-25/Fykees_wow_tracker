// Release notes and SHA-256 checksums for GitHub releases.
// CLI: node scripts/release-notes.mjs <outDir> <file>...  → writes <outDir>/SHA256SUMS.txt and <outDir>/release-notes.md
import { createHash } from 'crypto'
import { createReadStream, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { fileURLToPath } from 'url'

function hashFile(path) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256')
    createReadStream(path)
      .on('data', (d) => h.update(d))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')))
  })
}

export async function checksums(paths) {
  const out = []
  for (const p of paths) out.push({ name: basename(p), sha256: await hashFile(p) })
  return out
}

export function sumsFile(sums) {
  return sums.map((s) => `${s.sha256}  ${s.name}\n`).join('')
}

export function releaseNotes(sums) {
  const rows = sums.map((s) => `| \`${s.name}\` | \`${s.sha256}\` |`).join('\n')
  return `**AzerothTracker – companion app for World of Warcraft: Forever** (Windows).

- \`AzerothTracker-*-win-x64.zip\` – the app. Unzip it to any folder (for example \`Documents\\AzerothTracker\`) and start \`AzerothTracker.exe\` from that folder. Nothing is installed. Windows SmartScreen may warn because the app is not signed: *More info → Run anyway*.
- \`AzerothTracker-addon-*.zip\` – the in-game addon. Unzip into \`<game folder>\\Interface\\AddOns\\\`.

No game yet? On the first screen choose **Try with demo data**.
What it does and does not do: see the README. Pre-releases are test builds.

### Checksums (SHA-256)

Built by GitHub Actions from the public source of this release. To check a download, run in PowerShell
\`Get-FileHash .\\<file name>\` and compare the result with the table (also in \`SHA256SUMS.txt\`).

| File | SHA-256 |
| --- | --- |
${rows}
`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [outDir, ...files] = process.argv.slice(2)
  const sums = await checksums(files)
  writeFileSync(join(outDir, 'SHA256SUMS.txt'), sumsFile(sums))
  writeFileSync(join(outDir, 'release-notes.md'), releaseNotes(sums))
  process.stdout.write(sumsFile(sums))
}
