'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {
  createDrivingState,
  createKeyState,
  handleKeyDown,
  handleKeyUp,
  updateDriving,
  applyToCarGroup,
  updateChaseCamera,
} from './porsche911/driving-controls'
import type { DrivingState, KeyState } from './porsche911/driving-controls'

interface Props {
  className?: string
  onSpeedChange?: (speed: number) => void
  onRevChange?: (revving: boolean) => void
}

const BG = 0x1a1a24
const GRID_COLOR = 0x2a2a34
const CHUNK_SIZE = 80
const VIEW_DIST = 2 // 5x5 = 25 chunks max (down from 7x7 = 49)

// ── Reusable geometries + materials (created ONCE) ──────────────
let sharedGroundGeo: THREE.PlaneGeometry | null = null
let sharedGroundMat: THREE.MeshBasicMaterial | null = null
let sharedDashGeo: THREE.PlaneGeometry | null = null
let sharedDashMat: THREE.MeshBasicMaterial | null = null
let sharedEdgeGeo: THREE.PlaneGeometry | null = null
let sharedEdgeMat: THREE.MeshBasicMaterial | null = null

function getShared() {
  if (!sharedGroundGeo) {
    sharedGroundGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 1, 1)
    sharedGroundMat = new THREE.MeshBasicMaterial({ color: 0x141418 }) // BasicMaterial = no lighting calc
    sharedDashGeo = new THREE.PlaneGeometry(0.12, 2.5)
    sharedDashMat = new THREE.MeshBasicMaterial({ color: 0x4a4a58 })
    sharedEdgeGeo = new THREE.PlaneGeometry(0.08, CHUNK_SIZE)
    sharedEdgeMat = new THREE.MeshBasicMaterial({ color: 0x3a3a48 })
  }
  return { sharedGroundGeo, sharedGroundMat: sharedGroundMat!, sharedDashGeo: sharedDashGeo!, sharedDashMat: sharedDashMat!, sharedEdgeGeo: sharedEdgeGeo!, sharedEdgeMat: sharedEdgeMat! }
}

function buildInfiniteGround(): {
  group: THREE.Group
  update: (cx: number, cz: number) => void
} {
  const group = new THREE.Group()
  const loaded = new Map<string, THREE.Object3D>()
  const shared = getShared()

  function chunkKey(gx: number, gz: number): string {
    return gx + ',' + gz
  }

  function createChunk(gx: number, gz: number): THREE.Object3D {
    const chunk = new THREE.Group()

    // Ground plane — MeshBasicMaterial (no lighting)
    const plane = new THREE.Mesh(shared.sharedGroundGeo!, shared.sharedGroundMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.set(gx * CHUNK_SIZE, -0.46, gz * CHUNK_SIZE)
    chunk.add(plane)

    // Grid — only for nearby chunks
    const dist = Math.abs(gx) + Math.abs(gz)
    if (dist <= 2) {
      const grid = new THREE.GridHelper(CHUNK_SIZE, 12, GRID_COLOR, GRID_COLOR) // reduced from 20 to 12 subdivisions
      grid.position.set(gx * CHUNK_SIZE, -0.45, gz * CHUNK_SIZE)
      chunk.add(grid)
    }

    // Road markings — only center column
    if (gx === 0) {
      const startZ = gz * CHUNK_SIZE - CHUNK_SIZE / 2
      for (let z = startZ; z < startZ + CHUNK_SIZE; z += 8) { // wider spacing
        const dash = new THREE.Mesh(shared.sharedDashGeo!, shared.sharedDashMat)
        dash.rotation.x = -Math.PI / 2
        dash.position.set(0, -0.44, z)
        chunk.add(dash)
      }
      for (const xOff of [-4, 4]) {
        const edge = new THREE.Mesh(shared.sharedEdgeGeo!, shared.sharedEdgeMat)
        edge.rotation.x = -Math.PI / 2
        edge.position.set(xOff, -0.44, gz * CHUNK_SIZE)
        chunk.add(edge)
      }
    }

    // NO more PointLights per chunk — biggest perf killer removed
    // Lamp posts are just visual meshes now (emissive material fakes the glow)
    if (gx === 0 && dist <= 1) {
      const lampMat = new THREE.MeshBasicMaterial({ color: 0x333338 })
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 })
      const lampGeo = new THREE.CylinderGeometry(0.05, 0.07, 4, 4) // 4 sides instead of 6
      const headGeo = new THREE.SphereGeometry(0.15, 4, 4) // 4 segments instead of 8

      const startZ2 = gz * CHUNK_SIZE - CHUNK_SIZE / 2
      for (let z = startZ2 + 20; z < startZ2 + CHUNK_SIZE; z += 40) { // wider spacing
        for (const side of [-1, 1]) {
          const pole = new THREE.Mesh(lampGeo, lampMat)
          pole.position.set(side * 6, 1.55, z)
          chunk.add(pole)
          const head = new THREE.Mesh(headGeo, glowMat)
          head.position.set(side * 6, 3.6, z)
          chunk.add(head)
          // NO PointLight — this was creating 28+ dynamic lights
        }
      }
    }

    group.add(chunk)
    return chunk
  }

  function update(cx: number, cz: number): void {
    const gcx = Math.round(cx / CHUNK_SIZE)
    const gcz = Math.round(cz / CHUNK_SIZE)

    const needed = new Set<string>()
    for (let dx = -VIEW_DIST; dx <= VIEW_DIST; dx++) {
      for (let dz = -VIEW_DIST; dz <= VIEW_DIST; dz++) {
        const key = chunkKey(gcx + dx, gcz + dz)
        needed.add(key)
        if (!loaded.has(key)) {
          loaded.set(key, createChunk(gcx + dx, gcz + dz))
        }
      }
    }

    for (const [key, chunk] of loaded) {
      if (!needed.has(key)) {
        group.remove(chunk)
        loaded.delete(key)
      }
    }
  }

  return { group, update }
}

export function Porsche911DrivingViewer({ className, onSpeedChange, onRevChange }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<DrivingState>(createDrivingState())
  const keysRef = useRef<KeyState>(createKeyState())
  const camPosRef = useRef(new THREE.Vector3(0, 3, -8))
  const camLookRef = useRef(new THREE.Vector3(0, 1, 4))
  const focusedRef = useRef(false)

  const handleFocus = useCallback(() => { focusedRef.current = true }, [])
  const handleBlur = useCallback(() => { focusedRef.current = false }, [])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // Renderer — capped pixel ratio, disabled antialias on mobile
    const isMobile = window.innerWidth < 768
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.shadowMap.enabled = false // shadows OFF — huge perf gain
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.5
    el.appendChild(renderer.domElement)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(BG)
    scene.fog = new THREE.FogExp2(BG, 0.008)

    // Lights — minimal: just 3 lights total (ambient + directional + hemi)
    scene.add(new THREE.AmbientLight(0xffffff, 1.0))
    const dir = new THREE.DirectionalLight(0xfff0dd, 2.0)
    dir.position.set(5, 10, 5)
    scene.add(dir)
    const hemi = new THREE.HemisphereLight(0x556688, 0x1a1a24, 0.8)
    scene.add(hemi)

    // Infinite ground
    const ground = buildInfiniteGround()
    scene.add(ground.group)
    ground.update(0, 0)

    // Car
    const car = new THREE.Group()
    car.userData.wheels = []
    scene.add(car)

    // Load model
    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    loader.setDRACOLoader(dracoLoader)
    loader.load('/models/mclaren_p1.glb', (gltf) => {
      const model = gltf.scene

      // Auto-fit
      const box = new THREE.Box3().setFromObject(model)
      const sz = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(sz.x, sz.y, sz.z)
      const scale = 4.5 / maxDim
      model.scale.setScalar(scale)
      const center = box.getCenter(new THREE.Vector3())
      model.position.sub(center.multiplyScalar(scale))
      model.position.y = 0

      // Optimize meshes — disable per-object shadows, use simpler materials where possible
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.castShadow = false
          mesh.receiveShadow = false
          mesh.frustumCulled = true
        }
      })
      car.add(model)

      // Cleanup draco decoder after load
      dracoLoader.dispose()
    })

    // Camera
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.5, 200) // near 0.5 instead of 0.1
    camera.position.copy(camPosRef.current)

    // Input
    const onKeyDown = (e: KeyboardEvent) => {
      if (!focusedRef.current) return
      const code = e.code
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(code)) {
        e.preventDefault()
      }
      handleKeyDown(keysRef.current, code)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      handleKeyUp(keysRef.current, e.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Animation loop — with frame budget
    const clock = new THREE.Clock()
    let rafId = 0
    let hudTick = 0
    let groundTick = 0

    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)

      // Driving physics
      stateRef.current = updateDriving(stateRef.current, keysRef.current, dt)
      const state = stateRef.current

      applyToCarGroup(car, state, dt)

      // Ground update throttled — every 0.5s instead of every frame
      groundTick += dt
      if (groundTick > 0.5) {
        groundTick = 0
        ground.update(state.posX, state.posZ)
      }

      // Move directional light to follow car (cheap)
      dir.position.set(state.posX + 5, 10, state.posZ + 5)

      // Chase camera
      const { camPos, camLook } = updateChaseCamera(
        camera, state, camPosRef.current, camLookRef.current, dt,
      )
      camPosRef.current = camPos
      camLookRef.current = camLook

      // Camera shake on rev (simplified)
      if (state.isRevving) {
        camera.position.x += (Math.random() - 0.5) * 0.02 * state.nitroBoost
        camera.position.y += (Math.random() - 0.5) * 0.02 * state.nitroBoost
      }

      renderer.render(scene, camera)

      // HUD (throttled)
      hudTick += dt
      if (hudTick > 0.15) {
        hudTick = 0
        onSpeedChange?.(Math.abs(Math.round(state.speed * 3.6)))
        onRevChange?.(state.isRevving)
      }
    }
    animate()

    // Resize (throttled)
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const obs = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!el) return
        renderer.setSize(el.clientWidth, el.clientHeight)
        camera.aspect = el.clientWidth / el.clientHeight
        camera.updateProjectionMatrix()
      }, 100)
    })
    obs.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      if (resizeTimer) clearTimeout(resizeTimer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      obs.disconnect()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [onSpeedChange, onRevChange])

  return (
    <div
      ref={mountRef}
      className={className ?? 'w-full h-full'}
      tabIndex={0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={() => mountRef.current?.focus()}
      style={{ outline: 'none', cursor: 'pointer' }}
    />
  )
}