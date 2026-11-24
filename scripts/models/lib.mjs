// Shared rules for the 3D asset pipeline. A model is defined only by
// assets/models/<id>/{source.glb, model.json}; everything under
// apps/web/public/models and the generated registry is build output.
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Bump when the optimization steps change so every model rebuilds
export const PIPELINE_VERSION = 3

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const ASSETS_DIR = path.join(REPO_ROOT, 'assets')
export const MODELS_SRC_DIR = path.join(ASSETS_DIR, 'models')
export const ENVS_SRC_DIR = path.join(ASSETS_DIR, 'environments')
export const LOCK_FILE = path.join(ASSETS_DIR, 'models.lock.json')
export const PUBLIC_DIR = path.join(REPO_ROOT, 'apps', 'web', 'public')
export const MODELS_OUT_DIR = path.join(PUBLIC_DIR, 'models')
export const ENVS_OUT_DIR = path.join(PUBLIC_DIR, 'environments')
export const REGISTRY_FILE = path.join(REPO_ROOT, 'apps', 'web', 'src', 'generated', 'model-registry.json')

// Triangles drawn per model; realism needs real geometry and current phones handle this comfortably
export const MAX_TRIANGLES = 250_000
export const MAX_BYTES = 3 * 1024 * 1024
export const MAX_TEXTURE_SIZE = 2048
export const ALLOWED_LICENSES = new Set(['CC0-1.0', 'CC-BY-4.0', 'Proprietary', 'Purchased', 'UNVERIFIED'])

const OVERRIDE_KEYS = new Set(['color', 'metalness', 'roughness', 'clearcoat', 'clearcoatRoughness', 'opacity'])
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const HEX_PATTERN = /^#[0-9a-f]{6}$/i

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
export const isLfsPointer = (buf) => buf.subarray(0, 40).toString('utf8').startsWith('version https://git-lfs')
export const toPosix = (p) => p.split(path.sep).join('/')

// Stable stringify so hashes and generated files don't depend on key order
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeysDeep(value[k])]))
  }
  return value
}

export const prettyJson = (value) => `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`

function checkKeys(obj, allowed, where, errors) {
  for (const key of Object.keys(obj ?? {})) if (!allowed.includes(key)) errors.push(`${where}: unknown field "${key}"`)
}

function checkStringArray(value, where, errors) {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || !v)) errors.push(`${where}: must be an array of non-empty strings`)
}

function validateCredit(credit, where, errors) {
  if (!credit || typeof credit !== 'object') return errors.push(`${where}.credit: required`)
  checkKeys(credit, ['author', 'license', 'source'], `${where}.credit`, errors)
  if (!ALLOWED_LICENSES.has(credit.license)) errors.push(`${where}.credit.license: "${credit.license}" is not allowed (NC/ND and unknown licenses are rejected)`)
  if (credit.license !== 'UNVERIFIED' && !credit.author) errors.push(`${where}.credit.author: required once the license is verified`)
}

function validateStudio(studio, where, errors) {
  checkKeys(studio, ['lengthM', 'forward', 'materials', 'paint', 'lights'], where, errors)
  if (!['+x', '-x', '+z', '-z'].includes(studio.forward)) errors.push(`${where}.forward: direction the car's nose points, one of +x, -x, +z, -z`)
  if (!(typeof studio.lengthM === 'number' && studio.lengthM > 1 && studio.lengthM < 8)) errors.push(`${where}.lengthM: real body length in metres is required`)
  for (const [key, o] of Object.entries(studio.materials ?? {})) {
    checkKeys(o, [...OVERRIDE_KEYS], `${where}.materials.${key}`, errors)
    if (o.color !== undefined && !HEX_PATTERN.test(o.color)) errors.push(`${where}.materials.${key}.color: must be #rrggbb`)
  }
  if (studio.paint) {
    checkKeys(studio.paint, ['materials', 'presets'], `${where}.paint`, errors)
    checkStringArray(studio.paint.materials, `${where}.paint.materials`, errors)
    for (const p of studio.paint.presets ?? []) {
      if (!p.name || !HEX_PATTERN.test(p.hex ?? '')) errors.push(`${where}.paint.presets: each preset needs a name and #rrggbb hex`)
    }
  }
  if (studio.lights) {
    checkKeys(studio.lights, ['head', 'tail'], `${where}.lights`, errors)
    checkStringArray(studio.lights.head ?? [], `${where}.lights.head`, errors)
    checkStringArray(studio.lights.tail ?? [], `${where}.lights.tail`, errors)
  }
}

function validateYears(years, where, errors) {
  checkKeys(years, ['from', 'to'], where, errors)
  if (!Number.isInteger(years.from)) errors.push(`${where}.from: first model year is required`)
  if (years.to !== undefined && !(Number.isInteger(years.to) && years.to >= years.from)) errors.push(`${where}.to: must be a year >= from`)
}

export function validateModel(m, folder) {
  const errors = []
  const where = `assets/models/${folder}/model.json`
  checkKeys(m, ['id', 'title', 'credit', 'match', 'years', 'studio', 'budgetException', 'notes'], where, errors)
  if (m.id !== folder || !ID_PATTERN.test(m.id ?? '')) errors.push(`${where}.id: must equal the folder name and be kebab-case`)
  if (typeof m.title !== 'string' || !m.title) errors.push(`${where}.title: required`)
  validateCredit(m.credit, where, errors)
  checkStringArray(m.match ?? [], `${where}.match`, errors)
  if ((m.match ?? []).some((s) => s !== s.toLowerCase())) errors.push(`${where}.match: use lowercase "make model" strings`)
  if (m.budgetException) {
    checkKeys(m.budgetException, ['maxTriangles', 'reason'], `${where}.budgetException`, errors)
    if (!m.budgetException.reason) errors.push(`${where}.budgetException.reason: explain why the budget is exceeded`)
  }
  if (m.years) validateYears(m.years, `${where}.years`, errors)
  if (m.studio) {
    validateStudio(m.studio, `${where}.studio`, errors)
    if (!m.years) errors.push(`${where}.years: required with studio, so the model is only shown for its own generation`)
  }
  return errors
}

export function validateEnvironment(e, folder) {
  const errors = []
  const where = `assets/environments/${folder}/env.json`
  checkKeys(e, ['id', 'title', 'credit'], where, errors)
  if (e.id !== folder || !ID_PATTERN.test(e.id ?? '')) errors.push(`${where}.id: must equal the folder name`)
  if (typeof e.title !== 'string' || !e.title) errors.push(`${where}.title: required`)
  validateCredit(e.credit, where, errors)
  return errors
}

async function listFolders(dir) {
  if (!existsSync(dir)) return []
  return (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()
}

export async function loadAssets() {
  const models = []
  for (const folder of await listFolders(MODELS_SRC_DIR)) {
    const manifest = JSON.parse(await readFile(path.join(MODELS_SRC_DIR, folder, 'model.json'), 'utf8'))
    models.push({ folder, manifest, source: path.join(MODELS_SRC_DIR, folder, 'source.glb'), errors: validateModel(manifest, folder) })
  }
  const environments = []
  for (const folder of await listFolders(ENVS_SRC_DIR)) {
    const manifest = JSON.parse(await readFile(path.join(ENVS_SRC_DIR, folder, 'env.json'), 'utf8'))
    environments.push({ folder, manifest, source: path.join(ENVS_SRC_DIR, folder, 'source.hdr'), errors: validateEnvironment(manifest, folder) })
  }
  return { models, environments }
}

// Only fields that change the optimized GLB; studio tweaks don't force a rebuild
export function modelConfigHash(manifest) {
  return sha256(stableJson({ pipeline: PIPELINE_VERSION, maxTriangles: maxTrianglesFor(manifest), maxTexture: MAX_TEXTURE_SIZE }))
}

export const maxTrianglesFor = (manifest) => manifest.budgetException?.maxTriangles ?? MAX_TRIANGLES
export const modelPublicPath = (id) => `/models/${id}.glb`
export const envPublicPath = (id) => `/environments/${id}.hdr`

export function renderRegistry({ models, environments }) {
  return prettyJson({
    generatedBy: 'scripts/models/build.mjs — edit assets/*/ manifests, then run pnpm models:build',
    models: Object.fromEntries(
      models.map(({ manifest: m }) => [
        m.id,
        { path: modelPublicPath(m.id), title: m.title, credit: m.credit, match: m.match ?? [], years: m.years ?? null, studio: m.studio ?? null },
      ]),
    ),
    environments: Object.fromEntries(
      environments.map(({ manifest: e }) => [e.id, { path: envPublicPath(e.id), title: e.title, credit: e.credit }]),
    ),
  })
}

// Triangles actually drawn: a mesh reused by several nodes counts once per node
export function countTrianglesFromJson(json) {
  const meshTris = (json.meshes ?? []).map((mesh) =>
    mesh.primitives.reduce((sum, prim) => {
      const accessorIndex = prim.indices ?? prim.attributes.POSITION
      return sum + Math.floor((json.accessors[accessorIndex]?.count ?? 0) / 3)
    }, 0),
  )
  return (json.nodes ?? []).reduce((sum, node) => sum + (node.mesh === undefined ? 0 : meshTris[node.mesh]), 0)
}

export function readGlbJson(buf) {
  const length = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + length).toString('utf8'))
}