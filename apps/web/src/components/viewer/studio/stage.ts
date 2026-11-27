import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

import { FLOOR_REFLECTION_SHADER } from './floor-reflection'

// Graphite rather than black: a lit studio cyc, brightest above the car and settling to
// BACKGROUND at the horizon, where the floor fades into it
export const BACKGROUND = '#1d1f23'
const BACKDROP_TOP = '#3a3d44'
const FLOOR_CENTER = '#383a40'
const MIRROR_RADIUS = 5
const FLOOR_RADIUS = 14

// The composer draws into its own buffers, so the renderer's antialias flag has no effect
const MSAA_SAMPLES = 4
// AO is blurred anyway, so half resolution looks the same for far less GPU time
const AO_SCALE = 0.5
const AO_DENOISE_RADIUS_PX = 8

class ScaledGTAOPass extends GTAOPass {
  override setSize(width: number, height: number) {
    super.setSize(Math.round(width * AO_SCALE), Math.round(height * AO_SCALE))
  }
}

export interface StageQuality {
  isHigh: boolean
}

export const detectQuality = (): StageQuality => ({
  isHigh: window.matchMedia('(min-width: 768px)').matches && window.devicePixelRatio <= 2.5,
})

export function createRenderer(el: HTMLElement, quality: StageQuality): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.isHigh ? 1.5 : 1))
  renderer.setSize(el.clientWidth, el.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  el.appendChild(renderer.domElement)
  return renderer
}

// Falls back to the built-in studio room when the HDRI is missing or fails to load
export async function loadEnvironment(renderer: THREE.WebGLRenderer, hdrPath: string | null): Promise<THREE.Texture> {
  const pmrem = new THREE.PMREMGenerator(renderer)
  try {
    if (!hdrPath) throw new Error('no hdri')
    const hdr = await new HDRLoader().loadAsync(hdrPath)
    hdr.mapping = THREE.EquirectangularReflectionMapping
    const env = pmrem.fromEquirectangular(hdr).texture
    hdr.dispose()
    return env
  } catch {
    return pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  } finally {
    pmrem.dispose()
  }
}

export function radialTexture(stops: [number, string][]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  stops.forEach(([at, color]) => g.addColorStop(at, color))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Screen-space vertical gradient; the floor covers the lower half, so it only shows above the horizon
function backdropTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, BACKDROP_TOP)
  g.addColorStop(0.55, BACKGROUND)
  g.addColorStop(1, BACKGROUND)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 2, 256)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function flatDisc(radius: number, y: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  return mesh
}

export interface StageParts {
  contact: THREE.Mesh
  mirror: Reflector | null
  floor: THREE.MeshBasicMaterial
}

// A small mirror under the car, covered by a floor that is slightly see-through
// near the car and blends into the background colour at the edge
function buildFloor(scene: THREE.Scene, el: HTMLElement, quality: StageQuality) {
  let mirror: Reflector | null = null
  if (quality.isHigh) {
    // Half resolution: the reflection is faint, and a full-size mirror doubles the frame cost
    mirror = new Reflector(new THREE.CircleGeometry(MIRROR_RADIUS, 96), {
      textureWidth: Math.round(el.clientWidth / 2),
      textureHeight: Math.round(el.clientHeight / 2),
      color: '#ffffff',
      shader: FLOOR_REFLECTION_SHADER,
    })
    mirror.rotation.x = -Math.PI / 2
    // The AO pass redraws the scene for normals; don't render the reflection again for it
    const renderReflection = mirror.onBeforeRender.bind(mirror)
    mirror.onBeforeRender = (renderer, target, ...rest) => {
      if (!target.overrideMaterial) renderReflection(renderer, target, ...rest)
    }
    scene.add(mirror)
  }
  const overlay = new THREE.MeshBasicMaterial({
    map: radialTexture([[0, FLOOR_CENTER], [0.3, FLOOR_CENTER], [1, BACKGROUND]]),
    alphaMap: radialTexture([[0, '#e2e2e2'], [0.25, '#ececec'], [MIRROR_RADIUS / FLOOR_RADIUS, '#fff'], [1, '#fff']]),
    transparent: quality.isHigh,
    toneMapped: false,
  })
  scene.add(flatDisc(FLOOR_RADIUS, 0.001, overlay))
  const shadows = new THREE.ShadowMaterial({ opacity: 0.45 })
  const shadowDisc = flatDisc(6, 0.002, shadows)
  shadowDisc.receiveShadow = true
  scene.add(shadowDisc)
  return { mirror, floor: overlay }
}

export function buildStage(scene: THREE.Scene, el: HTMLElement, quality: StageQuality): StageParts {
  scene.background = backdropTexture()
  const { mirror, floor } = buildFloor(scene, el, quality)

  const key = new THREE.DirectionalLight(0xffffff, 0.8)
  key.position.set(3, 9, 4)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.radius = 8
  key.shadow.bias = -0.0004
  // Without it the car's curved panels shadow themselves in a fine grid
  key.shadow.normalBias = 0.03
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 })
  scene.add(key)

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(0,0,0,0.9)'], [0.5, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true,
      depthWrite: false,
    }),
  )
  contact.rotation.x = -Math.PI / 2
  contact.position.y = 0.003
  scene.add(contact)
  return { contact, mirror, floor }
}

export function createComposer(
  renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, el: HTMLElement, quality: StageQuality,
): { composer: EffectComposer; ao: GTAOPass | null } {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2())
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: MSAA_SAMPLES })
  const composer = new EffectComposer(renderer, target)
  // A custom target makes the composer assume device pixels; restore CSS pixels
  composer.setSize(el.clientWidth, el.clientHeight)
  composer.addPass(new RenderPass(scene, camera))
  let ao: GTAOPass | null = null
  if (quality.isHigh) {
    ao = new ScaledGTAOPass(scene, camera, el.clientWidth, el.clientHeight)
    ao.updatePdMaterial({ radius: AO_DENOISE_RADIUS_PX * AO_SCALE })
    ao.updateGtaoMaterial({ radius: 0.3, distanceExponent: 1.5, thickness: 1, scale: 1 })
    ao.blendIntensity = 0.85
    composer.addPass(ao)
  }
  // No bloom: HDRI highlights on clearcoat are brighter than the car's lights, so any
  // threshold that lets the lights glow also blows out the paint
  composer.addPass(new OutputPass())
  return { composer, ao }
}

export function disposeScene(scene: THREE.Scene) {
  if (scene.background instanceof THREE.Texture) scene.background.dispose()
  scene.traverse((obj) => {
    // Reflector owns a render target that normal material disposal misses
    if (obj instanceof Reflector) return obj.dispose()
    if (!(obj instanceof THREE.Mesh)) return
    const mesh = obj as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
    mesh.geometry.dispose()
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    }
  })
}
// Steps quality down one notch at a time: AO first, then the mirror, then resolution
export function degradeQuality(
  parts: StageParts, ao: GTAOPass | null, renderer: THREE.WebGLRenderer, composer: EffectComposer,
): boolean {
  if (ao?.enabled) {
    ao.enabled = false
    return true
  }
  if (parts.mirror?.visible) {
    parts.mirror.visible = false
    parts.floor.transparent = false
    parts.floor.needsUpdate = true
    return true
  }
  if (renderer.getPixelRatio() > 1) {
    renderer.setPixelRatio(1)
    composer.setPixelRatio(1)
    return true
  }
  return false
}
