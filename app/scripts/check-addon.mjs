// Syntax-checks the in-game addon with luaparse (Lua 5.1) and validates the .toc.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import luaparse from 'luaparse'

const addonsDir = join(dirname(fileURLToPath(import.meta.url)), '../../addon')
const fail = (msg) => {
  console.error(`check:addon FAILED: ${msg}`)
  process.exit(1)
}

// Each addon folder, its .toc title and the SavedVariables table it must write.
const ADDONS = [
  { folder: 'AzerothTracker', title: 'AzerothTracker', db: 'AzerothTrackerDB' },
  { folder: 'AzerothTrackerProbe', title: 'AzerothTracker Probe', db: 'AzerothTrackerProbeDB' }
]

for (const { folder, title, db } of ADDONS) {
const addonDir = join(addonsDir, folder)
const toc = readFileSync(join(addonDir, `${folder}.toc`), 'utf8')

for (const required of ['## Interface:', `## Title: ${title}\n`, `## SavedVariables: ${db}\n`]) {
  if (!toc.includes(required)) fail(`.toc is missing "${required}"`)
}
const files = toc.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
if (files.length === 0) fail('.toc lists no Lua files')
for (const f of files) {
  const bytes = readFileSync(join(addonDir, f))
  // luaparse 'x-user-defined' wants bytes 0x80–0xFF as U+F780–U+F7FF
  const src = Array.from(bytes, (b) => String.fromCharCode(b >= 0x80 ? 0xf700 + b : b)).join('')
  try {
    luaparse.parse(src, { luaVersion: '5.1', encodingMode: 'x-user-defined' })
  } catch (e) {
    fail(`${f}: ${e.message}`)
  }
  if (!src.includes(db)) fail(`${f} never touches ${db}`)
  if (/COMBAT_LOG_EVENT|CombatLogGetCurrentEventInfo/.test(src)) fail(`${f} uses the combat log`)
}
console.log(`check:addon OK (${folder}: ${files.join(', ')})`)
}
