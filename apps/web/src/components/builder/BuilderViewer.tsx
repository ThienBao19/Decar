'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { useBuilderStore } from '@/store/builder-store'
import { loadBody } from '@/components/viewer/bodies/index'
import { getWheel } from '@/components/viewer/parts/wheels/index'
import { getAeroPart } from '@/components/viewer/parts/aero/index'
import { getExhaust } from '@/components/viewer/parts/exhaust/index'
import { getHeadlight, getTaillight } from '@/components/viewer/parts/lights/index'
import { getBrakeCaliper } from '@/components/viewer/parts/brakes/index'
import { buildPaintMaterial } from '@/components/viewer/paint/index'

export function BuilderViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const carGroupRef = useRef<THREE.Group | null>(null)
  const config = useBuilderStore((s) => s.config)

  // Init Three.js once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(4, 2, 5)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 3
    controls.maxDistance = 12
    controls.maxPolarAngle = Math.PI / 2 + 0.1

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xfff5e0, 2.5)
    key.position.set(5, 8, 4)
    key.castShadow = true
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xe0f0ff, 1.0)
    fill.position.set(-4, 3, -3)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 0.8)
    rim.position.set(0, 5, -6)
    scene.add(rim)

    // Ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.62
    ground.receiveShadow = true
    scene.add(ground)

    // Resize observer
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    })
    ro.observe(canvas)

    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      renderer.dispose()
    }
  }, [])

  // Rebuild car when config changes
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    void loadBody(config.baseBodyCategory).then((mod) => {
      // Remove old car
      if (carGroupRef.current) scene.remove(carGroupRef.current)

      const paintMat = buildPaintMaterial(config.paint)
      const car = mod.buildBody(config.paint.bodyColor)
      const slots = mod.getSlotPositions()

      // Apply wheels
      const wheelId = config.parts.wheel
      if (wheelId) {
        const wheelEntry = getWheel(wheelId)
        if (wheelEntry) {
          const positions = [slots.wheel_FL, slots.wheel_FR, slots.wheel_RL, slots.wheel_RR]
          positions.forEach((pos) => {
            const w = wheelEntry.build()
            w.position.set(pos.x, pos.y, pos.z)
            car.add(w)
          })
        }
      }

      // Attach aero parts
      const aeroParts: Array<[keyof typeof config.parts, keyof typeof slots]> = [
        ['front_bumper', 'front_bumper'],
        ['rear_bumper', 'rear_bumper'],
        ['spoiler', 'spoiler'],
        ['hood', 'hood'],
      ]
      aeroParts.forEach(([partCat, slotKey]) => {
        const id = config.parts[partCat]
        if (!id) return
        const entry = getAeroPart(id)
        if (!entry) return
        const mesh = entry.build()
        const slot = slots[slotKey]
        mesh.position.set(slot.x, slot.y, slot.z)
        car.add(mesh)
      })

      // Side skirts (left + right)
      const skirtsId = config.parts.side_skirts
      if (skirtsId) {
        const entry = getAeroPart(skirtsId)
        if (entry) {
          const L = entry.build()
          L.position.set(slots.side_skirt_L.x, slots.side_skirt_L.y, slots.side_skirt_L.z)
          car.add(L)
          const R = entry.build()
          R.position.set(slots.side_skirt_R.x, slots.side_skirt_R.y, slots.side_skirt_R.z)
          R.scale.x = -1
          car.add(R)
        }
      }

      // Exhaust (left + right slots)
      const exhaustId = config.parts.exhaust
      if (exhaustId) {
        const entry = getExhaust(exhaustId)
        if (entry) {
          const exL = entry.build()
          exL.position.set(slots.exhaust_L.x, slots.exhaust_L.y, slots.exhaust_L.z)
          car.add(exL)
          const exR = entry.build()
          exR.position.set(slots.exhaust_R.x, slots.exhaust_R.y, slots.exhaust_R.z)
          exR.scale.x = -1
          car.add(exR)
        }
      }

      // Headlights
      const hlId = config.parts.headlight
      if (hlId) {
        const entry = getHeadlight(hlId)
        if (entry) {
          const L = entry.build()
          L.position.set(slots.headlight_L.x, slots.headlight_L.y, slots.headlight_L.z)
          car.add(L)
          const R = entry.build()
          R.position.set(slots.headlight_R.x, slots.headlight_R.y, slots.headlight_R.z)
          R.scale.x = -1
          car.add(R)
        }
      }

      // Taillights (share headlight slots for now — bodies define them symmetrically)
      const tlId = config.parts.taillight
      if (tlId) {
        const entry = getTaillight(tlId)
        if (entry) {
          const tL = entry.build()
          tL.position.set(-slots.headlight_L.x, slots.headlight_L.y, -slots.headlight_L.z)
          car.add(tL)
          const tR = entry.build()
          tR.position.set(-slots.headlight_R.x, slots.headlight_R.y, -slots.headlight_R.z)
          tR.scale.x = -1
          car.add(tR)
        }
      }

      // Brake calipers at each wheel
      const brakeId = config.parts.brake_caliper
      if (brakeId) {
        const entry = getBrakeCaliper(brakeId)
        if (entry) {
          const positions = [slots.wheel_FL, slots.wheel_FR, slots.wheel_RL, slots.wheel_RR]
          positions.forEach((pos) => {
            const b = entry.build()
            b.position.set(pos.x, pos.y, pos.z)
            car.add(b)
          })
        }
      }

      // Override paint on body meshes
      car.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === 'body') {
          child.material = paintMat
        }
      })

      scene.add(car)
      carGroupRef.current = car
    })
  }, [config])

  return (
    <canvas
      ref={canvasRef}
      className='h-full w-full'
      style={{ display: 'block' }}
    />
  )
}