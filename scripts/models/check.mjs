// Fails when a GLB under apps/web/public/models breaks the asset rules:
// missing credit entry, non-commercial or unknown license, external textures,
// or size/triangle budgets. UNVERIFIED licenses only warn.
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import { CREDITS_FILE, MAX_BYTES, MAX_TRIANGLES, MODELS_DIR } from './budgets.mjs'

const ALLOWED_LICENSES = new Set(['CC0-1.0', 'CC-BY-4.0', 'Proprietary', 'Purchased'])

// Over the triangle budget on purpose; keep the reason next to the exception
const TRIANGLE_EXCEPTIONS = {
  'vehicles/ferrari_488.glb': 'hundreds of tiny disconnected parts; simplification cannot reduce it further',
}

async function listGlbs(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((e) => {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) return listGlbs(full)
      return e.name.endsWith('.glb') ? [full] : []
    }),
  )
  return nested.flat()
}

function readGltfJson(buf) {
  const jsonLength = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'))
}

// Counts per node so a mesh reused by several nodes (e.g. four wheels) counts each time it is drawn
function countTriangles(json) {
  const meshTris = (json.meshes ?? []).map((mesh) =>
    mesh.primitives.reduce((sum, prim) => {
      const accessorIndex = prim.indices ?? prim.attributes.POSITION
      return sum + Math.floor((json.accessors[accessorIndex]?.count ?? 0) / 3)
    }, 0),
  )
  return (json.nodes ?? []).reduce((sum, node) => sum + (node.mesh === undefined ? 0 : meshTris[node.mesh]), 0)
}

async function main() {
  const credits = JSON.parse(await readFile(CREDITS_FILE, 'utf8'))
  const errors = []
  const warnings = []

  for (const file of await listGlbs(MODELS_DIR)) {
    const rel = path.relative(MODELS_DIR, file).split(path.sep).join('/')
    const credit = credits[rel]
    if (!credit) {
      errors.push(`${rel}: no entry in model-credits.json`)
      continue
    }

    if (credit.license === 'UNVERIFIED') warnings.push(`${rel}: license not verified yet`)
    else if (/NC|ND/.test(credit.license) || !ALLOWED_LICENSES.has(credit.license)) {
      errors.push(`${rel}: license "${credit.license}" is not allowed for commercial use`)
    }

    const buf = await readFile(file)
    const json = readGltfJson(buf)
    const external = (json.images ?? []).filter((img) => img.uri && !img.uri.startsWith('data:'))
    if (external.length) errors.push(`${rel}: references external textures (${external.map((i) => i.uri).join(', ')})`)

    const bytes = (await stat(file)).size
    const maxBytes = MAX_BYTES[credit.tier] ?? MAX_BYTES.hero
    if (bytes > maxBytes) errors.push(`${rel}: ${Math.round(bytes / 1024)}KB exceeds ${credit.tier} budget of ${Math.round(maxBytes / 1024)}KB`)

    const tris = countTriangles(json)
    if (tris > MAX_TRIANGLES && !TRIANGLE_EXCEPTIONS[rel]) errors.push(`${rel}: ${tris} triangles exceeds ${MAX_TRIANGLES}`)
  }

  const stale = Object.keys(credits).filter((rel) => !rel.startsWith('_'))
  const present = new Set((await listGlbs(MODELS_DIR)).map((f) => path.relative(MODELS_DIR, f).split(path.sep).join('/')))
  for (const rel of stale) if (!present.has(rel)) warnings.push(`${rel}: listed in credits but file not found`)

  warnings.forEach((w) => console.warn(`warn   ${w}`))
  errors.forEach((e) => console.error(`error  ${e}`))
  console.log(`${present.size} models checked, ${errors.length} errors, ${warnings.length} warnings`)
  if (errors.length) process.exitCode = 1
}

await main()