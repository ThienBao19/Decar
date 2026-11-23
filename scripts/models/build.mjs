// pnpm models:build [--force]
// Rebuilds every model whose source or build config changed, always from the
// original source, then rewrites the lock file and the generated registry.
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

import {
  ENVS_OUT_DIR, LOCK_FILE, MAX_TEXTURE_SIZE, MODELS_OUT_DIR, REGISTRY_FILE, countTrianglesFromJson, isLfsPointer,
  loadAssets, maxTrianglesFor, modelConfigHash, prettyJson, readGlbJson, renderRegistry, sha256,
} from './lib.mjs'

const SIMPLIFY_ERRORS = [0.002, 0.005, 0.01]

async function createIO() {
  await MeshoptSimplifier.ready
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  })
}

async function optimizeModel(io, sourcePath, outPath, maxTriangles) {
  const doc = await io.read(sourcePath)
  await doc.transform(dedup(), prune(), weld())
  // One pass at a tight error often stops short of the target, so allow a little
  // more geometric error per pass and stop as soon as the model fits
  const triangles = async () => countTrianglesFromJson(readGlbJson(Buffer.from(await io.writeBinary(doc))))
  let tris = await triangles()
  for (const error of SIMPLIFY_ERRORS) {
    if (tris <= maxTriangles) break
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: (maxTriangles * 0.95) / tris, error }))
    tris = await triangles()
  }
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE] }),
    draco(),
  )
  await io.write(outPath, doc)
}

function describe(buf) {
  const json = readGlbJson(buf)
  return { bytes: buf.length, triangles: countTrianglesFromJson(json), textures: (json.images ?? []).length }
}

async function buildModels(models, lock, force) {
  const io = await createIO()
  const next = {}
  for (const { manifest, source } of models) {
    const sourceBuf = await readFile(source)
    if (isLfsPointer(sourceBuf)) throw new Error(`${manifest.id}: source.glb is an LFS pointer, run "git lfs pull" first`)
    const outPath = path.join(MODELS_OUT_DIR, `${manifest.id}.glb`)
    const entry = { sourceHash: sha256(sourceBuf), configHash: modelConfigHash(manifest) }
    const prev = lock[manifest.id]
    const isFresh = prev && prev.sourceHash === entry.sourceHash && prev.configHash === entry.configHash
      && existsSync(outPath) && sha256(await readFile(outPath)) === prev.outputHash
    if (isFresh && !force) {
      next[manifest.id] = prev
      console.log(`fresh  ${manifest.id}`)
      continue
    }
    await optimizeModel(io, source, outPath, maxTrianglesFor(manifest))
    const outBuf = await readFile(outPath)
    next[manifest.id] = { ...entry, outputHash: sha256(outBuf), ...describe(outBuf) }
    const kb = (n) => `${Math.round(n / 1024)}KB`
    console.log(`built  ${manifest.id}: ${kb(sourceBuf.length)} -> ${kb(outBuf.length)}, ${next[manifest.id].triangles} tris`)
  }
  return next
}

async function buildEnvironments(environments) {
  const next = {}
  for (const { manifest, source } of environments) {
    const buf = await readFile(source)
    if (isLfsPointer(buf)) throw new Error(`${manifest.id}: source.hdr is an LFS pointer, run "git lfs pull" first`)
    await copyFile(source, path.join(ENVS_OUT_DIR, `${manifest.id}.hdr`))
    next[manifest.id] = { sourceHash: sha256(buf), outputHash: sha256(buf), bytes: buf.length }
    console.log(`copied ${manifest.id}`)
  }
  return next
}

// Anything in the output folders that no manifest produces is stale
async function removeOrphans(dir, ext, ids) {
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name)
    if (name.endsWith(ext) && !ids.has(path.basename(name, ext))) {
      await rm(full)
      console.log(`removed stale ${path.relative(process.cwd(), full)}`)
    }
  }
}

async function main() {
  const force = process.argv.includes('--force')
  const assets = await loadAssets()
  const errors = [...assets.models, ...assets.environments].flatMap((a) => a.errors)
  if (errors.length) {
    errors.forEach((e) => console.error(`error  ${e}`))
    process.exit(1)
  }
  await mkdir(MODELS_OUT_DIR, { recursive: true })
  await mkdir(ENVS_OUT_DIR, { recursive: true })
  await mkdir(path.dirname(REGISTRY_FILE), { recursive: true })

  const lock = existsSync(LOCK_FILE) ? JSON.parse(await readFile(LOCK_FILE, 'utf8')) : { models: {}, environments: {} }
  const models = await buildModels(assets.models, lock.models ?? {}, force)
  const environments = await buildEnvironments(assets.environments)
  await removeOrphans(MODELS_OUT_DIR, '.glb', new Set(Object.keys(models)))
  await removeOrphans(ENVS_OUT_DIR, '.hdr', new Set(Object.keys(environments)))

  await writeFile(LOCK_FILE, prettyJson({ models, environments }))
  await writeFile(REGISTRY_FILE, renderRegistry(assets))
  console.log(`\n${Object.keys(models).length} models, ${Object.keys(environments).length} environments. Lock and registry updated.`)
}

await main()