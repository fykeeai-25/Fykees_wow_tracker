// Syntax-checks the in-game addon with luaparse (Lua 5.1) and validates the .toc.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import luaparse from 'luaparse'

const addonDir = join(dirname(fileURLToPath(import.meta.url)), '../../addon/AzerothTracker')
const toc = readFileSync(join(addonDir, 'AzerothTracker.toc'), 'utf8')
const fail = (msg) => {
  console.error(`check:addon FAILED: ${msg}`)
  process.exit(1)
}

for (const required of ['## Interface:', '## Title: AzerothTracker', '## SavedVariables: AzerothTrackerDB']) {
  if (!toc.includes(required)) fail(`.toc is missing "${required}"`)
}
const files = toc.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
if (files.length === 0) fail('.toc lists no Lua files')
for (const f of files) {
  const src = readFileSync(join(addonDir, f), 'utf8')
  try {
    luaparse.parse(src, { luaVersion: '5.1', encodingMode: 'x-user-defined' })
  } catch (e) {
    fail(`${f}: ${e.message}`)
  }
  if (!/AzerothTrackerDB/.test(src)) fail(`${f} never touches AzerothTrackerDB`)
}
console.log(`check:addon OK (${files.join(', ')})`)
