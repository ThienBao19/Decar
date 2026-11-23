import * as THREE from 'three'

import type { MaterialOverride, StudioConfig } from '@/lib/model-registry'

type CarMesh = THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>

export interface CarHandles {
  size: THREE.Vector3
  paint: THREE.MeshPhysicalMaterial[]
  originalPaint: THREE.Color[]
  headLights: THREE.MeshStandardMaterial[]
  tailLights: THREE.MeshStandardMaterial[]
}

const matches = (material: THREE.Material, keys: string[] = []) =>
  keys.some((k) => material.name.toLowerCase().includes(k.toLowerCase()))

function toPhysical(mat: THREE.MeshStandardMaterial, o: MaterialOverride): THREE.MeshPhysicalMaterial {
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

function upgrade(mat: THREE.Material, studio: StudioConfig): THREE.Material {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return mat
  const overrides = studio.materials ?? {}
  const key = Object.keys(overrides).find((k) => matches(mat, [k]))
  const needsPhysical = key !== undefined || matches(mat, studio.paint?.materials)
  return needsPhysical ? toPhysical(mat, key ? overrides[key]! : {}) : mat
}

// Applies manifest overrides and returns the materials the UI can drive
export function prepareCar(car: THREE.Object3D, studio: StudioConfig): Omit<CarHandles, 'size'> {
  const seen = new Set<THREE.Material>()
  car.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const mesh = obj as CarMesh
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => upgrade(m, studio)) : upgrade(mesh.material, studio)
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) seen.add(m)
  })
  const all = [...seen]
  const paint = all.filter((m): m is THREE.MeshPhysicalMaterial => m instanceof THREE.MeshPhysicalMaterial && matches(m, studio.paint?.materials))
  const lit = (keys?: string[]) => all.filter((m): m is THREE.MeshStandardMaterial => m instanceof THREE.MeshStandardMaterial && matches(m, keys))
  return {
    paint,
    originalPaint: paint.map((m) => m.color.clone()),
    headLights: lit(studio.lights?.head),
    tailLights: lit(studio.lights?.tail),
  }
}

// Scales the car to its real length and stands it on the floor at the origin
export function fitCar(car: THREE.Object3D, lengthM: number): THREE.Vector3 {
  const size = new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3())
  car.scale.setScalar(lengthM / Math.max(size.x, size.z))
  const box = new THREE.Box3().setFromObject(car)
  const center = box.getCenter(new THREE.Vector3())
  car.position.set(car.position.x - center.x, car.position.y - box.min.y, car.position.z - center.z)
  return box.getSize(new THREE.Vector3())
}

export function setPaint(handles: CarHandles, hex: string | null) {
  handles.paint.forEach((m, i) => m.color.copy(hex ? new THREE.Color(hex) : handles.originalPaint[i]!))
}

export function setLights(handles: CarHandles, isOn: boolean) {
  const glow = (mats: THREE.MeshStandardMaterial[], color: string, intensity: number) => {
    for (const m of mats) {
      m.emissive.set(isOn ? color : '#000000')
      m.emissiveIntensity = isOn ? intensity : 0
    }
  }
  glow(handles.headLights, '#f4f8ff', 6)
  glow(handles.tailLights, '#ff1a1a', 5)
}