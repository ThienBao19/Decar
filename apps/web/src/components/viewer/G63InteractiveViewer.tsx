'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface Props {
  className?: string
}

// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  body:      0x8B9178,
  bodyDark:  0x6B7060,
  sand:      0xBFB89A,
  dark:      0x1A1A1F,
  glass:     0x2a3040,
  rubber:    0x111114,
  chrome:    0xA0A09A,
  headlight: 0xB8A860,
  spare:     0x7A8070,
  bg:        0x0D0D12,
}

function makeGradientMap(): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    new Uint8Array([38, 122, 196]), 3, 1,
    THREE.RedFormat, THREE.UnsignedByteType, THREE.UVMapping,
    THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
    THREE.NearestFilter, THREE.NearestFilter,
  )
  tex.needsUpdate = true
  return tex
}

function toon(color: number, opacity = 1, transparent = false): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: makeGradientMap(), opacity, transparent })
}

function edge(mesh: THREE.Mesh): THREE.LineSegments {
  const geo = new THREE.EdgesGeometry(mesh.geometry, 18)
  const mat = new THREE.LineBasicMaterial({ color: 0x1a1a1f, linewidth: 1.2 })
  const lines = new THREE.LineSegments(geo, mat)
  lines.scale.copy(mesh.scale)
  lines.position.copy(mesh.position)
  lines.rotation.copy(mesh.rotation)
  return lines
}

function addMesh(scene: THREE.Scene, geo: THREE.BufferGeometry, mat: THREE.MeshToonMaterial, pos: [number,number,number], rot?: [number,number,number]): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(...pos)
  if (rot) mesh.rotation.set(...rot)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  scene.add(edge(mesh))
  return mesh
}

function buildG63(scene: THREE.Scene): void {
  // Body
  addMesh(scene, new THREE.BoxGeometry(2.2, 0.9, 4.2), toon(C.body), [0, 0.45, 0])
  // Roof
  addMesh(scene, new THREE.BoxGeometry(1.9, 0.55, 2.4), toon(C.body), [0, 1.17, -0.1])
  // Hood
  addMesh(scene, new THREE.BoxGeometry(2.0, 0.12, 1.2), toon(C.bodyDark), [0, 0.92, 1.3])
  // Rear bumper
  addMesh(scene, new THREE.BoxGeometry(2.2, 0.35, 0.18), toon(C.dark), [0, 0.22, -2.1])
  // Front bumper
  addMesh(scene, new THREE.BoxGeometry(2.2, 0.35, 0.18), toon(C.dark), [0, 0.22, 2.1])
  // Left fender
  addMesh(scene, new THREE.BoxGeometry(0.18, 0.55, 3.6), toon(C.body), [-1.19, 0.62, 0])
  // Right fender
  addMesh(scene, new THREE.BoxGeometry(0.18, 0.55, 3.6), toon(C.body), [1.19, 0.62, 0])
  // Left door
  addMesh(scene, new THREE.BoxGeometry(0.12, 0.82, 1.7), toon(C.body), [-1.17, 0.6, -0.2])
  // Right door
  addMesh(scene, new THREE.BoxGeometry(0.12, 0.82, 1.7), toon(C.body), [1.17, 0.6, -0.2])
  // Windshield
  addMesh(scene, new THREE.BoxGeometry(1.75, 0.7, 0.08), toon(C.glass, 0.55, true), [0, 1.02, 0.9], [0.28, 0, 0])
  // Rear glass
  addMesh(scene, new THREE.BoxGeometry(1.75, 0.58, 0.08), toon(C.glass, 0.5, true), [0, 0.98, -1.35], [-0.22, 0, 0])
  // Side windows L
  addMesh(scene, new THREE.BoxGeometry(0.07, 0.4, 1.1), toon(C.glass, 0.5, true), [-1.12, 1.05, -0.2])
  // Side windows R
  addMesh(scene, new THREE.BoxGeometry(0.07, 0.4, 1.1), toon(C.glass, 0.5, true), [1.12, 1.05, -0.2])
  // Running board L
  addMesh(scene, new THREE.BoxGeometry(0.22, 0.1, 3.2), toon(C.dark), [-1.22, -0.06, -0.1])
  // Running board R
  addMesh(scene, new THREE.BoxGeometry(0.22, 0.1, 3.2), toon(C.dark), [1.22, -0.06, -0.1])
  // Left headlight
  addMesh(scene, new THREE.BoxGeometry(0.55, 0.28, 0.12), toon(C.headlight), [-0.7, 0.7, 2.07])
  // Right headlight
  addMesh(scene, new THREE.BoxGeometry(0.55, 0.28, 0.12), toon(C.headlight), [0.7, 0.7, 2.07])
  // Grille
  addMesh(scene, new THREE.BoxGeometry(1.4, 0.35, 0.12), toon(C.dark), [0, 0.58, 2.09])

  // Spare wheel (rear-mounted)
  const spareGeo = new THREE.TorusGeometry(0.38, 0.13, 8, 16)
  const spare = new THREE.Mesh(spareGeo, toon(C.spare))
  spare.position.set(0, 0.68, -2.22)
  spare.castShadow = true
  scene.add(spare)
  scene.add(edge(spare))
  const spareCap = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), toon(C.chrome))
  spareCap.position.set(0, 0.68, -2.33)
  scene.add(spareCap)

  // Wheels — 4 corners
  const wheelPositions: [number, number, number][] = [
    [-1.18, -0.08, 1.28],
    [1.18, -0.08, 1.28],
    [-1.18, -0.08, -1.28],
    [1.18, -0.08, -1.28],
  ]
  for (const pos of wheelPositions) {
    // Tyre
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.18, 12, 24), toon(C.rubber))
    tyre.rotation.y = Math.PI / 2
    tyre.position.set(...pos)
    tyre.castShadow = true
    scene.add(tyre)
    // Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12), toon(C.chrome))
    rim.rotation.z = Math.PI / 2
    rim.position.set(...pos)
    scene.add(rim)
    scene.add(edge(rim))
  }

  // Undercarriage
  addMesh(scene, new THREE.BoxGeometry(1.8, 0.12, 3.6), toon(C.dark), [0, -0.26, 0])
}

export function G63InteractiveViewer({ className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(C.bg)
    scene.fog = new THREE.Fog(C.bg, 14, 22)

    // Grid
    const grid = new THREE.GridHelper(14, 20, 0x1e1e24, 0x1e1e24)
    grid.position.y = -0.46
    scene.add(grid)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const spot = new THREE.SpotLight(0xD4B483, 4.0, 18, Math.PI / 4, 0.4)
    spot.position.set(3, 7, 5)
    spot.castShadow = true
    spot.shadow.mapSize.setScalar(1024)
    scene.add(spot)
    scene.add(spot.target)
    const fill = new THREE.DirectionalLight(0x8B9178, 0.6)
    fill.position.set(-4, 3, -4)
    scene.add(fill)

    // Build car
    buildG63(scene)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 50)
    camera.position.set(3.8, 2.4, 5.2)

    // Controls — enabled immediately for manual drag
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 3.5
    controls.maxDistance = 10
    controls.maxPolarAngle = Math.PI / 2
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6
    controls.target.set(0, 0.3, 0)
    controls.update()

    // Animate
    let rafId = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const obs = new ResizeObserver(() => {
      if (!el) return
      renderer.setSize(el.clientWidth, el.clientHeight)
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
    })
    obs.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      obs.disconnect()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className={className ?? 'w-full h-full'} />
}