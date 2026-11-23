import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { ExhaustEffect } from '../porsche911/exhaust-effect'
import { TireSparks } from '../tire-sparks'
import { createGroundGrid } from './ground-grid'
import { getModelPath } from '@/lib/vehicle-models'
const BG = 0x060b18
const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const DEFAULT_MODEL = '/models/mclaren_p1.glb'
export interface Rig { renderer: THREE.WebGLRenderer; scene: THREE.Scene; car: THREE.Group; grid: THREE.Object3D; dir: THREE.DirectionalLight; exhaust: ExhaustEffect; sparks: TireSparks; dispose: () => void }
export function buildRig(el: HTMLDivElement, bodyColor?: number, make?: string, model?: string, bodyType?: string | null): Rig {
  const isMobile = window.innerWidth < 768
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5))
  renderer.setSize(el.clientWidth, el.clientHeight); renderer.setClearColor(BG); el.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0x3355aa, 1.0))
  const dir = new THREE.DirectionalLight(0x88aaff, 2.2); dir.position.set(5, 10, 5); scene.add(dir)
  const grid = createGroundGrid(); scene.add(grid)
  const car = new THREE.Group(); scene.add(car)
  const exhaust = new ExhaustEffect(scene); const sparks = new TireSparks(scene)
  const loader = new GLTFLoader(); const draco = new DRACOLoader()
  draco.setDecoderPath(DRACO_CDN); loader.setDRACOLoader(draco)
  const glbPath = make && model ? getModelPath(make, model, bodyType) : DEFAULT_MODEL
  loader.load(glbPath, (gltf) => {
    const m = gltf.scene; const box = new THREE.Box3().setFromObject(m)
    const sz = box.getSize(new THREE.Vector3()); const scale = 4.5 / Math.max(sz.x, sz.y, sz.z)
    m.scale.setScalar(scale)
    const center = box.getCenter(new THREE.Vector3())
    m.position.sub(center.multiplyScalar(scale)); m.position.setY(0); car.add(m); draco.dispose()
  }, undefined, () => {
    void import('../porsche911/build-porsche911').then(({ buildPorsche911 }) => car.add(buildPorsche911(bodyColor)))
  })
  return { renderer, scene, car, grid, dir, exhaust, sparks, dispose: () => { exhaust.dispose(); sparks.dispose(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement) } }
}
