// Usage: node scripts/build-data-pack.mjs <dataDir> <outFile> <dataVersion>
import { mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { buildPack } from './data-pack.mjs'

const [dataDir, outFile, version] = process.argv.slice(2)
if (!dataDir || !outFile || version === undefined) {
  console.error('usage: build-data-pack.mjs <dataDir> <outFile> <dataVersion>')
  process.exit(2)
}
try {
  const pack = buildPack(dataDir, Number(version))
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, JSON.stringify(pack))
  const recipes = pack.professions.reduce((n, p) => n + p.recipes.length, 0)
  console.log(`data pack v${pack.manifest.dataVersion}: ${pack.professions.length} professions, ${recipes} recipes → ${outFile}`)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
