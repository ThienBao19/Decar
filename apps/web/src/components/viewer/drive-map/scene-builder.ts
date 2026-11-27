import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

import type { VehicleCategory } from '@decar/shared'
import type { ModelEntry } from '@/lib/model-registry'

import { loadBody } from '../bodies'
import { ExhaustEffect } from '../porsche911/exhaust-effect'
import { TireSparks } from '../tire-sparks'
import { fitCar, prepareCar } from '../studio/car'
import { disposeScene } from '../studio/stage'
import { findWheelRig, updateWheelRig, yawToFaceZ, type WheelRig } from './wheel-rig'

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
// One texture tile of asphalt, in metres; the ground snaps to whole tiles as the car moves
const TILE_M = 24
const GROUND_M = TILE_M * 25
const HAZE = '#c8d3de'
// Late-afternoon sun: low enough for long shadows and warm light
const SUN_ELEVATION_DEG = 28
const SUN_AZIMUTH_DEG = 135

function sunDirection(): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION_DEG)
  const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG)
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
}

function createSky(): Sky {
  const sky = new Sky()
  sky.scale.setScalar(10000)
  const u = sky.material.uniforms
  u['turbidity']!.value = 3
  u['rayleigh']!.value = 1.2
  u['mieCoefficient']!.value = 0.004
  u['mieDirectionalG']!.value = 0.8
  ;(u['sunPosition']!.value as THREE.Vector3).copy(sunDirection())
  return sky
}

// Speckled asphalt with a dashed lane line down the middle of each tile
function asphaltTexture(): THREE.CanvasTexture {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#3c3e41'
  ctx.fillRect(0, 0, size, size)
  // Deterministic speckle, so the surface doesn't change between visits
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 60000; i++) {
    const shade = 40 + Math.floor(rand() * 40)
    ctx.fillStyle = `rgba(${shade},${shade},${shade + 2},${0.35 + rand() * 0.4})`
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2)
  }
  const px = size / TILE_M
  ctx.fillStyle = 'rgba(232,232,226,0.85)'
  for (let z = 0; z < TILE_M; z += 6) ctx.fillRect(size / 2 - 0.075 * px, z * px, 0.15 * px, 3 * px)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(GROUND_M / TILE_M, GROUND_M / TILE_M)
  tex.anisotropy = 8
  return tex
}

function createGround(): THREE.Mesh {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_M, GROUND_M),
    new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.92, metalness: 0 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  return ground
}

function createSun(): THREE.DirectionalLight {
  const sun = new THREE.DirectionalLight('#fff1dc', 3.2)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.03
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 })
  return sun
}

// A registry model with a studio config, or a builder body (procedural, from /builder)
export type DriveSource =
  | { kind: 'model'; entry: ModelEntry }
  | { kind: 'body'; category: VehicleCategory; color?: number }

// Builder bodies have no real length; drive them at a typical car's
const BODY_LENGTH_M = 4.5

export interface Rig {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  car: THREE.Group
  exhaust: ExhaustEffect
  sparks: TireSparks
  // Keeps the ground and the sun's shadow camera around the car
  follow: (x: number, z: number) => void
  updateWheels: (speed: number, steerAngle: number, dt: number) => void
  dispose: () => void
}

function createRenderer(el: HTMLDivElement): THREE.WebGLRenderer {
  const isMobile = window.innerWidth < 768
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5))
  renderer.setSize(el.clientWidth, el.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  el.appendChild(renderer.domElement)
  return renderer
}

// Reflections come from the same sky the background shows
function skyEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.add(createSky())
  const env = pmrem.fromScene(envScene).texture
  pmrem.dispose()
  return env
}

async function loadCar(entry: ModelEntry): Promise<THREE.Object3D> {
  const draco = new DRACOLoader()
  draco.setDecoderPath(DRACO_CDN)
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  try {
    return (await loader.loadAsync(entry.path)).scene
  } finally {
    draco.dispose()
  }
}

function addModel(car: THREE.Group, entry: ModelEntry, isDisposed: () => boolean, onWheels: (rig: WheelRig | null) => void) {
  const studio = entry.studio
  if (!studio) throw new Error(`${entry.id} has no studio config`)
  return loadCar(entry).then((model) => {
    if (isDisposed()) return
    prepareCar(model, studio)
    // Fit before turning: fitCar recentres in its parent's frame
    fitCar(model, studio.lengthM)
    const turned = new THREE.Group()
    turned.rotation.y = yawToFaceZ(studio.forward)
    turned.add(model)
    car.add(turned)
    car.updateMatrixWorld(true)
    onWheels(findWheelRig(model, studio.forward))
  })
}

function addBody(car: THREE.Group, category: VehicleCategory, color: number | undefined, isDisposed: () => boolean) {
  return loadBody(category).then((mod) => {
    if (isDisposed()) return
    const body = mod.buildBody(color)
    body.traverse((obj) => { obj.castShadow = true })
    fitCar(body, BODY_LENGTH_M)
    car.add(body)
    // applyToCarGroup spins wheels listed on the group it moves
    car.userData['wheels'] = body.userData['wheels'] as unknown
  })
}

export function buildRig(el: HTMLDivElement, source: DriveSource, onError: () => void): Rig {
  const renderer = createRenderer(el)
  const scene = new THREE.Scene()
  scene.add(createSky())
  scene.environment = skyEnvironment(renderer)
  scene.fog = new THREE.Fog(HAZE, 80, 320)
  scene.add(new THREE.HemisphereLight('#cfe0ff', '#3a3530', 0.4))
  const sun = createSun()
  scene.add(sun, sun.target)
  const ground = createGround()
  scene.add(ground)

  const car = new THREE.Group()
  scene.add(car)
  const exhaust = new ExhaustEffect(scene)
  const sparks = new TireSparks(scene)
  let wheels: WheelRig | null = null
  let isDisposed = false

  const disposed = () => isDisposed
  const loading = source.kind === 'model'
    ? addModel(car, source.entry, disposed, (rig) => { wheels = rig })
    : addBody(car, source.category, source.color, disposed)
  loading.catch(onError)

  const sunOffset = sunDirection().multiplyScalar(30)
  return {
    renderer, scene, car, exhaust, sparks,
    follow: (x, z) => {
      ground.position.set(Math.round(x / TILE_M) * TILE_M, 0, Math.round(z / TILE_M) * TILE_M)
      sun.position.set(x + sunOffset.x, sunOffset.y, z + sunOffset.z)
      sun.target.position.set(x, 0, z)
    },
    updateWheels: (speed, steerAngle, dt) => {
      if (wheels) wheels = updateWheelRig(wheels, speed, steerAngle, dt)
    },
    dispose: () => {
      isDisposed = true
      exhaust.dispose()
      sparks.dispose()
      scene.environment?.dispose()
      disposeScene(scene)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    },
  }
}