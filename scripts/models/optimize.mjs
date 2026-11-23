// Optimizes every GLB under apps/web/public/models in place.
// Originals are copied to .model-originals/ (gitignored) before the first rewrite.
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

import { MAX_TRIANGLES, countTriangles, MODELS_DIR, REPO_ROOT } from './budgets.mjs'

const BACKUP_DIR = path.join(REPO_ROOT, '.model-originals')
const MAX_TEXTURE_SIZE = 2048

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

async function backup(file) {
  const target = path.join(BACKUP_DIR, path.relative(MODELS_DIR, file))
  if (existsSync(target)) return
  await mkdir(path.dirname(target), { recursive: true })
  await copyFile(file, target)
}

async function main() {
  const force = process.argv.includes('--force')
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    })
  await MeshoptSimplifier.ready

  for (const file of await listGlbs(MODELS_DIR)) {
    const rel = path.relative(MODELS_DIR, file)
    const before = (await stat(file)).size
    let doc
    try {
      doc = await io.read(file)
    } catch (err) {
      console.error(`error  ${rel}: ${err.message}`)
      process.exitCode = 1
      continue
    }
    const tris = countTriangles(doc)
    const isCompressed = doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'KHR_draco_mesh_compression')
    if (isCompressed && tris <= MAX_TRIANGLES && !force) {
      console.log(`skip   ${rel} (already compressed, ${tris} tris)`)
      continue
    }

    await backup(file)
    const transforms = [dedup(), prune(), weld()]
    if (tris > MAX_TRIANGLES) {
      // Aim slightly under budget; error caps how far the silhouette may drift
      transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio: (MAX_TRIANGLES * 0.95) / tris, error: 0.002 }))
    }
    transforms.push(
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE] }),
      draco(),
    )
    await doc.transform(...transforms)
    await io.write(file, doc)

    const after = (await stat(file)).size
    const kb = (n) => `${Math.round(n / 1024)}KB`
    console.log(`write  ${rel}: ${kb(before)} -> ${kb(after)}, ${tris} -> ${countTriangles(doc)} tris`)
  }
}

await main()