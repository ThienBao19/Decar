'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { STUDIO_ENVIRONMENT, type ModelEntry, type StudioConfig } from '@/lib/model-registry'

import { fitCar, prepareCar, setLights, setPaint, type CarHandles } from './studio/car'
import {
  buildStage, createComposer, createRenderer, degradeQuality, detectQuality, disposeScene, loadEnvironment,
} from './studio/stage'
import { StudioControls } from './studio/StudioControls'
import { poseFor, stepToward, type CameraPose, type ViewName } from './studio/views'

declare global {
  interface Window {
    __studioReady?: boolean
  }
}

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const SNAPSHOT_SETTLE_FRAMES = 5
// Frames averaged before deciding whether to lower quality
const PERF_SAMPLE_FRAMES = 10
// The first seconds pay for shader compilation and texture uploads, and stepping down is permanent
const PERF_WARMUP_SECONDS = 2.5
// Frames land on display refreshes, so 17-33 ms of work shows as 33 ms; only slower than that counts
const MAX_FRAME_SECONDS = 1 / 24
// One frame drawing while the next is queued keeps the GPU fed; more would pile up and freeze the page
const MAX_FRAMES_IN_FLIGHT = 2

interface Rig {
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  handles: CarHandles
  studio: StudioConfig
  goal: CameraPose | null
}

interface Props {
  model: ModelEntry
  title: string
  // Fixed camera, no UI or auto-rotate; sets window.__studioReady for screenshots
  isSnapshot?: boolean
  initialView?: ViewName
}

async function loadCar(path: string): Promise<THREE.Group> {
  const draco = new DRACOLoader()
  draco.setDecoderPath(DRACO_CDN)
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  try {
    return (await loader.loadAsync(path)).scene
  } finally {
    draco.dispose()
  }
}

function createControls(camera: THREE.PerspectiveCamera, dom: HTMLElement, isSnapshot: boolean): OrbitControls {
  const controls = new OrbitControls(camera, dom)
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.06, enablePan: false, autoRotate: !isSnapshot, autoRotateSpeed: 0.5,
    minDistance: 3.5, maxDistance: 13, minPolarAngle: 0.2, maxPolarAngle: Math.PI / 2 - 0.05,
  })
  return controls
}

export function StudioViewer({ model, title, isSnapshot = false, initialView = 'front34' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<Rig | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [view, setView] = useState<ViewName>(initialView)
  const [paint, setPaintState] = useState<string | null>(null)
  const [isLightsOn, setLightsOn] = useState(false)
  const studio = model.studio

  useEffect(() => {
    const el = mountRef.current
    if (!el || !studio) return
    let isDisposed = false
    let isVisible = true
    let frame = 0
    const quality = detectQuality()
    const renderer = createRenderer(el, quality)
    const scene = new THREE.Scene()
    const parts = buildStage(scene, el, quality)
    const camera = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 0.1, 100)
    const controls = createControls(camera, renderer.domElement, isSnapshot)
    controls.addEventListener('start', () => { controls.autoRotate = false })
    const { composer, ao } = createComposer(renderer, scene, camera, el, quality)
    window.__studioReady = false

    const setup = async () => {
      const [env, car] = await Promise.all([loadEnvironment(renderer, STUDIO_ENVIRONMENT?.path ?? null), loadCar(model.path)])
      if (isDisposed) return
      scene.environment = env
      scene.environmentIntensity = 0.85
      const handles = prepareCar(car, studio)
      const size = fitCar(car, studio.lengthM)
      parts.contact.scale.set(size.x * 1.2, size.z * 1.2, 1)
      scene.add(car)
      // The car and key light never move, so one shadow map serves every frame
      renderer.shadowMap.autoUpdate = false
      renderer.shadowMap.needsUpdate = true
      // Compile off the render path so the car's first frames don't hitch
      await renderer.compileAsync(scene, camera)
      if (isDisposed) return
      const pose = poseFor(initialView, size, studio.forward)
      camera.position.copy(pose.position)
      controls.target.copy(pose.target)
      rigRef.current = { camera, controls, handles: { ...handles, size }, studio, goal: null }
      setStatus('ready')
    }
    setup().catch(() => !isDisposed && setStatus('error'))

    const timer = new THREE.Timer()
    let settled = 0
    let warmup = PERF_WARMUP_SECONDS
    let sampled = 0
    let sampledTime = 0
    let skipped = 0
    let fences: WebGLSync[] = []
    const gl = renderer.getContext() as WebGL2RenderingContext
    const isGpuBusy = () => {
      fences = fences.filter((fence) => {
        const isPending = gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED
        if (!isPending) gl.deleteSync(fence)
        return isPending
      })
      return fences.length >= MAX_FRAMES_IN_FLIGHT
    }
    // Snapshots keep fixed quality so review images are comparable across machines
    const adaptQuality = (dt: number) => {
      // A long frame without GPU waits is a throttled tab or a main-thread stall, not a slow GPU
      const isThrottled = document.hidden || (dt > 0.2 && skipped === 0)
      skipped = 0
      if (isSnapshot || isThrottled) return
      warmup -= dt
      if (warmup > 0) return
      sampled++
      sampledTime += dt
      if (sampled < PERF_SAMPLE_FRAMES) return
      const isSlow = sampledTime / sampled > MAX_FRAME_SECONDS
      sampled = 0
      sampledTime = 0
      if (isSlow) degradeQuality(parts, ao, renderer, composer)
    }
    const tick = (time?: number) => {
      frame = requestAnimationFrame(tick)
      if (!isVisible) return
      if (isGpuBusy()) {
        skipped++
        return
      }
      timer.update(time)
      const dt = timer.getDelta()
      const rig = rigRef.current
      if (rig?.goal && stepToward(camera, controls.target, rig.goal, dt)) rig.goal = null
      controls.update()
      composer.render()
      const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
      if (fence) fences = [...fences, fence]
      gl.flush()
      if (!rig) return
      adaptQuality(dt)
      if (isSnapshot && ++settled === SNAPSHOT_SETTLE_FRAMES) {
        // Stop rendering so the page goes idle and screenshots don't wait on slow frames
        cancelAnimationFrame(frame)
        window.__studioReady = true
      }
    }
    tick()

    const io = new IntersectionObserver(([entry]) => { isVisible = entry?.isIntersecting ?? true })
    io.observe(el)
    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
      composer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    return () => {
      isDisposed = true
      rigRef.current = null
      cancelAnimationFrame(frame)
      io.disconnect()
      ro.disconnect()
      controls.dispose()
      composer.dispose()
      scene.environment?.dispose()
      disposeScene(scene)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [model.path, studio, isSnapshot, initialView])

  const handleView = useCallback((next: ViewName) => {
    const rig = rigRef.current
    if (!rig) return
    rig.controls.autoRotate = false
    rig.goal = poseFor(next, rig.handles.size, rig.studio.forward)
    setView(next)
  }, [])

  const handlePaint = useCallback((hex: string | null) => {
    if (rigRef.current) setPaint(rigRef.current.handles, hex)
    setPaintState(hex)
  }, [])

  const handleLights = useCallback(() => {
    const next = !isLightsOn
    if (rigRef.current) setLights(rigRef.current.handles, next)
    setLightsOn(next)
  }, [isLightsOn])

  const hasLights = Boolean(studio?.lights?.head?.length || studio?.lights?.tail?.length)

  return (
    <div className="relative h-full w-full bg-[#1d1f23]">
      <div ref={mountRef} className="h-full w-full" aria-label={`${title} 3D studio view`} />
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-[#898989]">
          Loading studio…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#898989]">
          The 3D model could not be loaded.
        </div>
      )}
      {status === 'ready' && !isSnapshot && (
        <StudioControls
          view={view}
          onView={handleView}
          presets={studio?.paint?.presets ?? []}
          paint={paint}
          onPaint={handlePaint}
          hasLights={hasLights}
          isLightsOn={isLightsOn}
          onLights={handleLights}
        />
      )}
    </div>
  )
}