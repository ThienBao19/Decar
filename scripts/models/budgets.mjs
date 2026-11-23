import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const MODELS_DIR = path.join(REPO_ROOT, 'apps', 'web', 'public', 'models')
export const CREDITS_FILE = path.join(REPO_ROOT, 'apps', 'web', 'src', 'data', 'model-credits.json')

export const MAX_TRIANGLES = 150_000
export const MAX_BYTES = { hero: 3 * 1024 * 1024, fallback: 512 * 1024 }

// Counts per node so a mesh reused by several nodes is counted each time it is drawn
export function countTriangles(doc) {
  let total = 0
  for (const node of doc.getRoot().listNodes()) {
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const indices = prim.getIndices()
      const count = indices ? indices.getCount() : prim.getAttribute('POSITION')?.getCount() ?? 0
      total += Math.floor(count / 3)
    }
  }
  return total
}