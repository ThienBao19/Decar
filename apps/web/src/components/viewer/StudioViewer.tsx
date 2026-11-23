'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import type { MaterialOverride, StudioModel } from '@/lib/studio-models'

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const BACKGROUND = 0x0f1012

type CarMesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>

function upgradeMaterial(mat: THREE.Material, o: MaterialOverride): THREE.Material {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return mat
  const phys = new THREE.MeshPhysicalMaterial()
  THREE.MeshStandardMaterial.prototype.copy.call(phys, mat)
  // Standard copy() resets defines, which would silently disable clearcoat
  phys.defines = { STANDARD: '', PHYSICAL: '' }
  if (o.color) phys.color.set(o.color)
  if (o.metalness !== undefined) phys.metalness = o.metalness
  if (o.roughness !== undefined) phys.roughness = o.roughness
  if (o.clearcoat !== undefined) phys.clearcoat = o.clearcoat
  if (o.clearcoatRoughness !== undefined) phys.clearcoatRoughness = o.clearcoatRoughness
  if (o.opacity !== undefined) {
    phys.transparent = true
    phys.opacity = o.opacity
    phys.depthWrite = false
  }
  return phys
}

function prepareCar(car: THREE.Object3D, overrides: Record<string, MaterialOverride>) {
  const keys = Object.keys(overrides)
  car.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const mesh = obj as CarMesh
    mesh.castShadow = true
    mesh.receiveShadow = true
    const swap = (m: THREE.Material) => {
      const key = keys.find((k) => m.name.toLowerCase().includes(k.toLowerCase()))
      const override = key ? overrides[key] : undefined
      return override ? upgradeMaterial(m, override) : m
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
  })
}

// Scales the car to its real length and stands it on the floor at the origin
function fitCar(car: THREE.Object3D, lengthM: number): THREE.Vector3 {
  const size = new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3())
  car.scale.setScalar(lengthM / Math.max(size.x, size.z))
  const box = new THREE.Box3().setFromObject(car)
  const center = box.getCenter(new THREE.Vector3())
  car.position.set(car.position.x - center.x, car.position.y - box.min.y, car.position.z - center.z)
  return box.getSize(new THREE.Vector3())
}

function radialTexture(stops: [number, string][]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  stops.forEach(([at, color]) => g.addColorStop(at, color))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

function contactShadow(): THREE.Mesh {
  const map = radialTexture([[0, 'rgba(0,0,0,0.95)'], [0.55, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']])
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.002
  return mesh
}

function buildStage(scene: THREE.Scene) {
  scene.background = new THREE.Color(BACKGROUND)
  // Floor fades out radially instead of using fog, which would also haze the car
  // Lambert ignores scene.environment, so the floor doesn't mirror the bright studio room
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(10, 64),
    new THREE.MeshLambertMaterial({
      color: 0x2a2b30,
      transparent: true,
      alphaMap: radialTexture([[0, '#fff'], [0.3, '#fff'], [0.85, '#000']]),
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(4, 9, 5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.radius = 6
  key.shadow.bias = -0.0004
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 })
  scene.add(key)
  const shadow = contactShadow()
  scene.add(shadow)
  return shadow
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const mesh = obj as CarMesh
    mesh.geometry.dispose()
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    }
  })
}

interface Props {
  model: StudioModel
  title: string
}

export function StudioViewer({ model, title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.AgXToneMapping
    renderer.toneMappingExposure = 0.92
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    const shadow = buildStage(scene)

    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.1, 100)
    camera.position.set(6.2, 1.9, 6.8)
    const controls = new OrbitControls(camera, renderer.domElement)
    Object.assign(controls, {
      enableDamping: true, dampingFactor: 0.06, enablePan: false, autoRotate: true, autoRotateSpeed: 0.6,
      minDistance: 4, maxDistance: 14, minPolarAngle: 0.25, maxPolarAngle: Math.PI / 2 - 0.06,
    })
    controls.addEventListener('start', () => { controls.autoRotate = false })

    const draco = new DRACOLoader()
    draco.setDecoderPath(DRACO_CDN)
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    loader.load(
      model.path,
      (gltf) => {
        prepareCar(gltf.scene, model.materials)
        const size = fitCar(gltf.scene, model.lengthM)
        shadow.scale.set(size.x * 1.25, size.z * 1.25, 1)
        controls.target.set(0, size.y * 0.4, 0)
        scene.add(gltf.scene)
        setStatus('ready')
      },
      (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)) },
      () => setStatus('error'),
    )

    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()
    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      controls.dispose()
      draco.dispose()
      disposeScene(scene)
      env.dispose()
      pmrem.dispose()
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [model])

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" aria-label={`${title} 3D studio view`} />
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-[#898989]">
          Loading model… {progress > 0 && `${progress}%`}
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#898989]">
          The 3D model could not be loaded.
        </div>
      )}
      {status === 'ready' && (
        <p className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-[#4d4d4d]">Drag to rotate · Scroll to zoom</p>
      )}
    </div>
  )
}