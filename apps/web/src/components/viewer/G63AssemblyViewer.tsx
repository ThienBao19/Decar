'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

// ─── Military / Halo colour palette ──────────────────────────────────────────
const C = {
  body:      0x8B9178,
  fender:    0x7E8470,
  door:      0x82876E,
  roof:      0x838970,
  bumper:    0x5A5A48,
  step:      0x484838,
  wheel:     0x1A1A18,
  rim:       0x646058,
  grille:    0x111110,
  headlight: 0xB8A860,
  spare:     0x1A1A18,
  outline:   0x252520,
  bg:        0x0D0D12,
  floor:     0x0F0F14,
}

// ─── Part definition ──────────────────────────────────────────────────────────
interface PartDef {
  name: string
  geo: () => THREE.BufferGeometry
  color: number
  pos: [number, number, number]
  rot?: [number, number, number]
  explode: [number, number, number]
  explodeRot?: [number, number, number]
}

// G63 build: origin = ground-centre; x=forward, y=up, z=right
const PARTS: PartDef[] = [
  // ── Core body
  { name: 'body_main',          geo: () => new THREE.BoxGeometry(3.5, 1.0, 1.92),    color: C.body,      pos: [0, 1.12, 0],           explode: [0, -12, 0],         explodeRot: [0.3, 0, 0.15] },
  // ── Fenders
  { name: 'front_left_fender',  geo: () => new THREE.BoxGeometry(0.88, 0.48, 0.22),  color: C.fender,    pos: [1.22, 1.02, 0.99],     explode: [5, 4, 10],          explodeRot: [0.2, 0.3, 0] },
  { name: 'front_right_fender', geo: () => new THREE.BoxGeometry(0.88, 0.48, 0.22),  color: C.fender,    pos: [1.22, 1.02, -0.99],    explode: [5, 4, -10],         explodeRot: [0.2, -0.3, 0] },
  // ── Doors
  { name: 'front_left_door',    geo: () => new THREE.BoxGeometry(0.06, 0.84, 0.88),  color: C.door,      pos: [0.64, 1.38, 0.985],    explode: [3, 4, 12],          explodeRot: [0, 0, 0.4] },
  { name: 'front_right_door',   geo: () => new THREE.BoxGeometry(0.06, 0.84, 0.88),  color: C.door,      pos: [0.64, 1.38, -0.985],   explode: [3, 4, -12],         explodeRot: [0, 0, -0.4] },
  { name: 'rear_left_door',     geo: () => new THREE.BoxGeometry(0.06, 0.84, 0.88),  color: C.door,      pos: [-0.58, 1.38, 0.985],   explode: [-2, 4, 12],         explodeRot: [0, 0, 0.4] },
  { name: 'rear_right_door',    geo: () => new THREE.BoxGeometry(0.06, 0.84, 0.88),  color: C.door,      pos: [-0.58, 1.38, -0.985],  explode: [-2, 4, -12],        explodeRot: [0, 0, -0.4] },
  // ── Top panels
  { name: 'hood',               geo: () => new THREE.BoxGeometry(1.24, 0.06, 1.88),  color: C.body,      pos: [1.5, 1.68, 0],         explode: [6, 10, 0],          explodeRot: [0, 0, -0.5] },
  { name: 'roof_panel',         geo: () => new THREE.BoxGeometry(1.94, 0.06, 1.88),  color: C.roof,      pos: [0.08, 2.06, 0],        explode: [0, 14, 0],          explodeRot: [0.3, 0, 0] },
  // ── Bumpers
  { name: 'front_bumper',       geo: () => new THREE.BoxGeometry(0.28, 0.44, 1.92),  color: C.bumper,    pos: [2.08, 0.82, 0],        explode: [13, 0, 0],          explodeRot: [0, 0.5, 0] },
  { name: 'rear_bumper',        geo: () => new THREE.BoxGeometry(0.28, 0.44, 1.92),  color: C.bumper,    pos: [-2.08, 0.82, 0],       explode: [-13, 0, 0],         explodeRot: [0, -0.5, 0] },
  // ── Spare wheel on rear gate
  { name: 'spare_wheel_cover',  geo: () => new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24), color: C.spare, pos: [-2.26, 1.42, 0], rot: [0, 0, Math.PI / 2],     explode: [-15, 0, 0] },
  // ── Side steps
  { name: 'side_step_left',     geo: () => new THREE.BoxGeometry(1.64, 0.1, 0.2),    color: C.step,      pos: [0, 0.52, 1.02],        explode: [0, -7, 9],          explodeRot: [0.5, 0, 0] },
  { name: 'side_step_right',    geo: () => new THREE.BoxGeometry(1.64, 0.1, 0.2),    color: C.step,      pos: [0, 0.52, -1.02],       explode: [0, -7, -9],         explodeRot: [-0.5, 0, 0] },
  // ── Wheels (24-seg smooth tire)
  { name: 'wheel_FL', geo: () => new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24), color: C.wheel, pos: [1.22, 0.42, 1.04],  rot: [Math.PI / 2, 0, 0], explode: [3, -8, 8] },
  { name: 'wheel_FR', geo: () => new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24), color: C.wheel, pos: [1.22, 0.42, -1.04], rot: [Math.PI / 2, 0, 0], explode: [3, -8, -8] },
  { name: 'wheel_RL', geo: () => new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24), color: C.wheel, pos: [-1.1, 0.42, 1.04],  rot: [Math.PI / 2, 0, 0], explode: [-3, -8, 8] },
  { name: 'wheel_RR', geo: () => new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24), color: C.wheel, pos: [-1.1, 0.42, -1.04], rot: [Math.PI / 2, 0, 0], explode: [-3, -8, -8] },
  // ── Rims (8-seg faceted = spoke look)
  { name: 'rim_FL', geo: () => new THREE.CylinderGeometry(0.22, 0.22, 0.26, 8), color: C.rim, pos: [1.22, 0.42, 1.04],  rot: [Math.PI / 2, 0, 0], explode: [4, -5, 9] },
  { name: 'rim_FR', geo: () => new THREE.CylinderGeometry(0.22, 0.22, 0.26, 8), color: C.rim, pos: [1.22, 0.42, -1.04], rot: [Math.PI / 2, 0, 0], explode: [4, -5, -9] },
  { name: 'rim_RL', geo: () => new THREE.CylinderGeometry(0.22, 0.22, 0.26, 8), color: C.rim, pos: [-1.1, 0.42, 1.04],  rot: [Math.PI / 2, 0, 0], explode: [-4, -5, 9] },
  { name: 'rim_RR', geo: () => new THREE.CylinderGeometry(0.22, 0.22, 0.26, 8), color: C.rim, pos: [-1.1, 0.42, -1.04], rot: [Math.PI / 2, 0, 0], explode: [-4, -5, -9] },
  // ── Grille & lights (last to lock in)
  { name: 'grille',      geo: () => new THREE.BoxGeometry(0.06, 0.56, 1.46), color: C.grille,    pos: [2.02, 1.06, 0],        explode: [14, 2, 0],          explodeRot: [0, 0.6, 0] },
  { name: 'headlight_L', geo: () => new THREE.BoxGeometry(0.2, 0.3, 0.46),   color: C.headlight, pos: [1.96, 1.18, 0.72],     explode: [9, 6, 7],           explodeRot: [0.3, 0.4, 0] },
  { name: 'headlight_R', geo: () => new THREE.BoxGeometry(0.2, 0.3, 0.46),   color: C.headlight, pos: [1.96, 1.18, -0.72],    explode: [9, 6, -7],          explodeRot: [0.3, -0.4, 0] },
]

// ─── Assembly order & timing ──────────────────────────────────────────────────
const SEQUENCE: { name: string; t: number }[] = [
  { name: 'body_main',          t: 0.0 },
  { name: 'front_left_fender',  t: 0.6 },
  { name: 'front_right_fender', t: 0.7 },
  { name: 'front_left_door',    t: 1.1 },
  { name: 'front_right_door',   t: 1.2 },
  { name: 'rear_left_door',     t: 1.6 },
  { name: 'rear_right_door',    t: 1.7 },
  { name: 'hood',               t: 2.1 },
  { name: 'roof_panel',         t: 2.6 },
  { name: 'front_bumper',       t: 3.0 },
  { name: 'rear_bumper',        t: 3.3 },
  { name: 'spare_wheel_cover',  t: 3.6 },
  { name: 'side_step_left',     t: 3.9 },
  { name: 'side_step_right',    t: 4.0 },
  { name: 'wheel_FL',           t: 4.4 },
  { name: 'wheel_FR',           t: 4.5 },
  { name: 'wheel_RL',           t: 4.7 },
  { name: 'wheel_RR',           t: 4.8 },
  { name: 'rim_FL',             t: 5.0 },
  { name: 'rim_FR',             t: 5.1 },
  { name: 'rim_RL',             t: 5.2 },
  { name: 'rim_RR',             t: 5.3 },
  { name: 'grille',             t: 5.7 },
  { name: 'headlight_L',        t: 6.1 },
  { name: 'headlight_R',        t: 6.2 },
]

// ─── 3-step toon gradient map ─────────────────────────────────────────────────
function makeGradientMap(): THREE.DataTexture {
  // Pass magFilter + minFilter in constructor to avoid property mutations
  // DataTexture(data, w, h, format, type, mapping, wrapS, wrapT, magFilter, minFilter)
  const tex = new THREE.DataTexture(
    new Uint8Array([38, 122, 196]), 3, 1,
    THREE.RedFormat,
    THREE.UnsignedByteType,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.NearestFilter,
    THREE.NearestFilter,
  )
  tex.needsUpdate = true
  return tex
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { className?: string }

export function G63AssemblyViewer({ className }: Props) {
  const mountRef    = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const partsMap    = useRef<Map<string, THREE.Group>>(new Map())
  const tlRef       = useRef<gsap.core.Timeline | null>(null)
  const ctrlRef     = useRef<OrbitControls | null>(null)
  const [done, setDone] = useState(false)

  // Stable startAssembly stored in ref so button can call it
  const startFnRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const mount = mountRef.current
    const parts = partsMap.current
    if (!mount) return

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(C.bg, 1)
    mount.appendChild(renderer.domElement)

    // ── Scene & camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(4.8, 2.6, 5.2)
    camera.lookAt(0, 1.0, 0)

    // ── Orbit controls (disabled until assembly finishes) ─────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.0, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = false
    controls.autoRotateSpeed = 0.5
    controls.enabled = false
    ctrlRef.current = controls

    // ── Lighting ──────────────────────────────────────────────────────────────
    // Very dim ambient
    scene.add(new THREE.AmbientLight(0x1A1A18, 0.4))

    // Warm top spotlight (the hero light)
    const spot = new THREE.SpotLight(0xD4B483, 18)
    spot.position.set(0, 9, 0)
    spot.angle = Math.PI / 5.5
    spot.penumbra = 0.45
    spot.decay = 1.8
    spot.castShadow = true
    spot.shadow.mapSize.setScalar(1024)
    spot.shadow.bias = -0.002
    scene.add(spot)
    scene.add(spot.target)  // target stays at origin

    // Faint fill from front-right to reveal front face detail
    const fill = new THREE.DirectionalLight(0xC4A860, 0.35)
    fill.position.set(5, 3, 4)
    scene.add(fill)

    // Subtle rim from behind
    const rim = new THREE.DirectionalLight(0x6A7060, 0.25)
    rim.position.set(-6, 4, -3)
    scene.add(rim)

    // ── Floor ─────────────────────────────────────────────────────────────────
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshLambertMaterial({ color: C.floor }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Faint dark-navy grid (barely visible as per spec)
    const grid = new THREE.GridHelper(30, 42, 0x1C1C24, 0x161620)
    grid.position.y = 0.002
    scene.add(grid)

    // Warm oval spotlight patch on ground
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(3.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0x2E2010,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    patch.rotation.x = -Math.PI / 2
    patch.position.y = 0.004
    scene.add(patch)

    // ── Build parts ───────────────────────────────────────────────────────────
    const gradMap = makeGradientMap()

    for (const def of PARTS) {
      const geo = def.geo()

      // Toon body mesh
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshToonMaterial({ color: def.color, gradientMap: gradMap }),
      )
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (def.rot) mesh.rotation.set(...def.rot)

      // Thin dark edge lines (panel seams)
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 14),
        new THREE.LineBasicMaterial({ color: C.outline, transparent: true, opacity: 0.7 }),
      )
      if (def.rot) edges.rotation.set(...def.rot)

      const group = new THREE.Group()
      group.add(mesh, edges)
      scene.add(group)
      partsMap.current.set(def.name, group)
    }

    // ── Assembly function ─────────────────────────────────────────────────────
    function startAssembly() {
      setDone(false)

      // Kill any running timeline
      tlRef.current?.kill()
      controls.enabled = false
      controls.autoRotate = false

      // Reset all parts to exploded positions + random rotations
      for (const def of PARTS) {
        const group = partsMap.current.get(def.name)
        if (!group) continue
        const fp = def.pos
        const ex = def.explode
        group.position.set(fp[0] + ex[0], fp[1] + ex[1], fp[2] + ex[2])
        group.scale.setScalar(1)
        const er = def.explodeRot
        const br = def.rot ?? [0, 0, 0]
        group.rotation.set(
          br[0] + (er ? er[0] : 0),
          br[1] + (er ? er[1] : 0),
          br[2] + (er ? er[2] : 0),
        )
      }

      // Progress bar
      if (progressRef.current) progressRef.current.style.width = '0%'

      // Build GSAP timeline
      const tl = gsap.timeline({
        onUpdate() {
          if (progressRef.current) {
            progressRef.current.style.width = `${Math.round(tl.progress() * 100)}%`
          }
        },
        onComplete() {
          controls.enabled = true
          controls.autoRotate = true
          setDone(true)
          if (progressRef.current) progressRef.current.style.width = '100%'
        },
      })

      for (const step of SEQUENCE) {
        const group = partsMap.current.get(step.name)
        if (!group) continue
        const def = PARTS.find((p) => p.name === step.name)!
        const fp = def.pos
        const fr = def.rot ?? [0, 0, 0]

        tl.to(group.position, { x: fp[0], y: fp[1], z: fp[2], duration: 0.42, ease: 'back.out(1.4)' }, step.t)
        tl.to(group.rotation, { x: fr[0], y: fr[1], z: fr[2], duration: 0.42, ease: 'back.out(1.4)' }, step.t)

        // Clank impact pulse at landing
        const landT = step.t + 0.42
        tl.to(group.scale, { x: 1.06, y: 1.06, z: 1.06, duration: 0.04, ease: 'none' }, landT)
        tl.to(group.scale, { x: 1.00, y: 1.00, z: 1.00, duration: 0.07, ease: 'power2.out' }, landT + 0.04)
      }

      tlRef.current = tl
    }

    startFnRef.current = startAssembly
    startAssembly()

    // ── Render loop ───────────────────────────────────────────────────────────
    let rafId = 0
    function animate() {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ────────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(mount)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      tlRef.current?.kill()
      ro.disconnect()
      controls.dispose()
      parts.forEach((group) => {
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
            (obj.geometry as THREE.BufferGeometry).dispose()
            const material = obj.material as THREE.Material | THREE.Material[]
            if (Array.isArray(material)) material.forEach((m) => m.dispose())
            else material.dispose()
          }
        })
      })
      gradMap.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className={`relative w-full select-none overflow-hidden rounded-sm bg-[#0D0D12] ${className ?? 'aspect-[16/7]'}`}>

      {/* Canvas container */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* ── HUD corner brackets ──────────────────────────────────────────── */}
      {/* Top-left */}
      <div className="pointer-events-none absolute left-3 top-3 h-7 w-7 border-l border-t border-[#6B8C7A]/50" />
      {/* Top-right */}
      <div className="pointer-events-none absolute right-3 top-3 h-7 w-7 border-r border-t border-[#6B8C7A]/50" />
      {/* Bottom-left */}
      <div className="pointer-events-none absolute bottom-7 left-3 h-7 w-7 border-b border-l border-[#6B8C7A]/50" />
      {/* Bottom-right */}
      <div className="pointer-events-none absolute bottom-7 right-3 h-7 w-7 border-b border-r border-[#6B8C7A]/50" />

      {/* ── Bottom label & progress ──────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-1.5">
        <span className="font-mono text-[10px] tracking-widest text-[#6B8C7A]/80">
          G63 AMG — ASSEMBLY SEQUENCE
        </span>
        <span className="font-mono text-[10px] text-[#6B8C7A]/40">{done ? 'COMPLETE' : 'ASSEMBLING'}</span>
      </div>

      {/* Progress bar — 2px line at very bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full bg-[#1A1A1F]">
        <div
          ref={progressRef}
          className="h-full bg-[#8B9178] transition-none"
          style={{ width: '0%' }}
        />
      </div>

      {/* ── Assemble button ───────────────────────────────────────────────── */}
      <button
        onClick={() => startFnRef.current()}
        className="absolute right-4 top-4 border border-[#6B8C7A]/40 bg-[#0D0D12]/80 px-3 py-1.5 font-mono text-[10px] tracking-widest text-[#6B8C7A] transition-colors hover:border-[#8B9178]/70 hover:text-[#8B9178]"
      >
        ASSEMBLE
      </button>

      {/* Drag hint (shown after done) */}
      {done && (
        <div className="pointer-events-none absolute left-4 top-4">
          <span className="font-mono text-[10px] tracking-widest text-[#6B8C7A]/50">DRAG TO ORBIT</span>
        </div>
      )}
    </div>
  )
}