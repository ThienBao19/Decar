// pnpm models:check — runs in CI without LFS sources. Fails when build output
// doesn't match the manifests and lock file, so every published model is
// reproducible from assets/ and nothing is edited by hand.
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import {
  ENVS_OUT_DIR, LOCK_FILE, MAX_BYTES, MODELS_OUT_DIR, REGISTRY_FILE, envConfigHash, isLfsPointer, loadAssets, maxTrianglesFor,
  modelConfigHash, readGlbJson, renderRegistry, sha256,
} from './lib.mjs'

function checkStudioNames(manifest, materialNames, errors) {
  const studio = manifest.studio
  if (!studio) return
  const keys = [
    ...Object.keys(studio.materials ?? {}),
    ...(studio.paint?.materials ?? []),
    ...(studio.lights?.head ?? []),
    ...(studio.lights?.tail ?? []),
  ]
  const lower = materialNames.map((n) => n.toLowerCase())
  for (const key of new Set(keys)) {
    if (!lower.some((n) => n.includes(key.toLowerCase()))) {
      errors.push(`${manifest.id}: studio key "${key}" matches no material in the model`)
    }
  }
}

async function checkModel({ manifest, source }, entry, errors, warnings) {
  const id = manifest.id
  const outPath = path.join(MODELS_OUT_DIR, `${id}.glb`)
  if (!entry) return errors.push(`${id}: not in models.lock.json, run pnpm models:build`)
  if (!existsSync(outPath)) return errors.push(`${id}: missing output ${id}.glb, run pnpm models:build`)

  const out = await readFile(outPath)
  if (sha256(out) !== entry.outputHash) errors.push(`${id}: output differs from the lock (edited by hand?), run pnpm models:build`)
  if (entry.configHash !== modelConfigHash(manifest)) errors.push(`${id}: build config changed, run pnpm models:build`)
  if (existsSync(source)) {
    const src = await readFile(source)
    if (!isLfsPointer(src) && sha256(src) !== entry.sourceHash) errors.push(`${id}: source.glb changed, run pnpm models:build`)
  } else {
    errors.push(`${id}: assets/models/${id}/source.glb is missing`)
  }

  const json = readGlbJson(out)
  const external = (json.images ?? []).filter((img) => img.uri && !img.uri.startsWith('data:'))
  if (external.length) errors.push(`${id}: references external textures`)
  if (out.length > MAX_BYTES) errors.push(`${id}: ${Math.round(out.length / 1024)}KB exceeds ${MAX_BYTES / 1024}KB`)
  if (entry.triangles > maxTrianglesFor(manifest)) errors.push(`${id}: ${entry.triangles} triangles exceeds ${maxTrianglesFor(manifest)}`)
  checkStudioNames(manifest, (json.materials ?? []).map((m) => m.name ?? ''), errors)
  if (manifest.credit.license === 'UNVERIFIED') warnings.push(`${id}: license not verified yet`)
}

async function checkOrphans(dir, ext, ids, errors) {
  if (!existsSync(dir)) return
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const isKnown = entry.isFile() && entry.name.endsWith(ext) && ids.has(path.basename(entry.name, ext))
    if (!isKnown) errors.push(`${path.basename(dir)}/${entry.name}: not produced by the pipeline; add assets/ sources instead`)
  }
}

async function main() {
  const assets = await loadAssets()
  const errors = [...assets.models, ...assets.environments].flatMap((a) => a.errors)
  const warnings = []
  const lock = existsSync(LOCK_FILE) ? JSON.parse(await readFile(LOCK_FILE, 'utf8')) : { models: {}, environments: {} }

  for (const model of assets.models) await checkModel(model, lock.models?.[model.manifest.id], errors, warnings)
  for (const { manifest } of assets.environments) {
    const entry = lock.environments?.[manifest.id]
    const outPath = path.join(ENVS_OUT_DIR, `${manifest.id}.hdr`)
    if (!entry || !existsSync(outPath) || sha256(await readFile(outPath)) !== entry.outputHash) {
      errors.push(`${manifest.id}: environment output missing or stale, run pnpm models:build`)
    } else if (entry.configHash !== envConfigHash(manifest)) {
      errors.push(`${manifest.id}: environment config changed, run pnpm models:build`)
    }
  }
  await checkOrphans(MODELS_OUT_DIR, '.glb', new Set(assets.models.map((m) => m.manifest.id)), errors)
  await checkOrphans(ENVS_OUT_DIR, '.hdr', new Set(assets.environments.map((e) => e.manifest.id)), errors)

  const registry = existsSync(REGISTRY_FILE) ? await readFile(REGISTRY_FILE, 'utf8') : ''
  // Git on Windows may check text out with CRLF
  if (registry.replaceAll(String.fromCharCode(13), '') !== renderRegistry(assets)) {
    errors.push('apps/web/src/generated/model-registry.json is stale, run pnpm models:build')
  }

  warnings.forEach((w) => console.warn(`warn   ${w}`))
  errors.forEach((e) => console.error(`error  ${e}`))
  console.log(`${assets.models.length} models, ${assets.environments.length} environments, ${errors.length} errors, ${warnings.length} warnings`)
  if (errors.length) process.exitCode = 1
}

await main()