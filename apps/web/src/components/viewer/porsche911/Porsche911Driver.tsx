'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { buildPorsche911 } from './build-porsche911'
import { buildEnvironment, buildLighting } from './build-environment'
import {
  createDrivingState,
  createKeyState,
  handleKeyDown,
  handleKeyUp,
  updateDriving,
  applyToCarGroup,
  updateChaseCamera,
} from './driving-controls'
import type { DrivingState, KeyState } from './driving-controls'
import { ExhaustEffect } from './exhaust-effect'

export function Porsche911Driver() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef = useRef<number>(0)
  const stateRef = useRef<DrivingState>(createDrivingState())
  const keysRef = useRef<KeyState>(createKeyState())
  const camPosRef = useRef(new THREE.Vector3(0, 3, -8))
  const camLookRef = useRef(new THREE.Vector3(0, 1, 4))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [speed, setSpeed] = useState(0)
  const [isRevving, setIsRevving] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050510)
    scene.fog = new THREE.FogExp2(0x050510, 0.008)

    // Camera
    const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 500)
    camera.position.copy(camPosRef.current)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.8
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Environment
    const env = buildEnvironment()
    scene.add(env)

    // Lighting
    buildLighting(scene)

    // Car
    const car = buildPorsche911()
    scene.add(car)

    // Exhaust
    const exhaust = new ExhaustEffect(scene)

    // Input
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      handleKeyDown(keysRef.current, e.code)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      handleKeyUp(keysRef.current, e.code)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Resize
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    // Animation loop
    const clock = new THREE.Clock()
    let hudTick = 0

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)

      // Update driving
      stateRef.current = updateDriving(stateRef.current, keysRef.current, dt)
      const state = stateRef.current

      // Apply to car
      applyToCarGroup(car, state, dt)

      // Exhaust effect
      if (state.isRevving || keysRef.current.shift) {
        exhaust.trigger(1 + state.nitroBoost)
      } else {
        exhaust.stop()
      }
      exhaust.update(
        new THREE.Vector3(state.posX, 0, state.posZ),
        state.heading,
        state.speed,
        dt,
      )

      // Camera shake on rev
      let shakeX = 0
      let shakeY = 0
      if (state.isRevving) {
        const intensity = 0.03 * state.nitroBoost
        shakeX = (Math.random() - 0.5) * intensity
        shakeY = (Math.random() - 0.5) * intensity
      }

      // Chase camera
      const { camPos, camLook } = updateChaseCamera(camera, state, camPosRef.current, camLookRef.current, dt)
      camPosRef.current = camPos
      camLookRef.current = camLook
      camera.position.x += shakeX
      camera.position.y += shakeY

      renderer.render(scene, camera)

      // HUD updates (throttled)
      hudTick += dt
      if (hudTick > 0.1) {
        hudTick = 0
        setSpeed(Math.abs(Math.round(state.speed * 3.6)))
        setIsRevving(state.isRevving)
      }
    }
    animate()

    // Hide controls hint after 5s
    const controlsTimer = setTimeout(() => setShowControls(false), 5000)

    return () => {
      cancelAnimationFrame(frameRef.current)
      clearTimeout(controlsTimer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      ro.disconnect()
      renderer.dispose()
      exhaust.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-[#050510]"
      style={{ height: isFullscreen ? '100vh' : '80vh', minHeight: '500px' }}
      tabIndex={0}
    >
      {/* HUD Overlay */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-[#3ecf8e]/70">
              Porsche 911 GT3
            </span>
            <span className="h-1 w-1 rounded-full bg-[#3ecf8e]/50" />
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-white/30">
              Drive Mode
            </span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="pointer-events-auto rounded-lg border border-white/10 bg-black/50 px-4 py-2 font-mono text-[12px] text-white/70 backdrop-blur-sm transition-colors hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e]"
          >
            {isFullscreen ? '[ EXIT ]' : '[ FULLSCREEN ]'}
          </button>
        </div>

        {/* Speedometer */}
        <div className="absolute bottom-8 left-8 flex flex-col items-start gap-1">
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[64px] font-bold leading-none tabular-nums"
              style={{ color: isRevving ? '#ff4400' : '#fafafa' }}
            >
              {speed}
            </span>
            <span className="font-mono text-[14px] uppercase tracking-[2px] text-white/40">
              km/h
            </span>
          </div>
          {isRevving && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4400]" />
              <span className="font-mono text-[12px] uppercase tracking-[2px] text-[#ff4400]">
                NITRO
              </span>
            </div>
          )}
          {/* Nitro bar */}
          <div className="mt-2 h-1 w-[200px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${Math.min(100, speed / 0.9)}%`,
                backgroundColor: speed > 200 ? '#ff4400' : '#3ecf8e',
              }}
            />
          </div>
        </div>

        {/* Gear indicator */}
        <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1">
          <span className="font-mono text-[14px] text-white/30">GEAR</span>
          <span className="font-mono text-[48px] font-bold leading-none text-white/80">
            {speed === 0 ? 'N' : speed < 30 ? '1' : speed < 60 ? '2' : speed < 100 ? '3' : speed < 150 ? '4' : speed < 200 ? '5' : '6'}
          </span>
        </div>

        {/* Controls hint */}
        {showControls && (
          <div className="absolute inset-x-0 bottom-24 flex justify-center">
            <div className="rounded-xl border border-white/10 bg-black/70 px-6 py-4 backdrop-blur-sm">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <kbd className="rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[13px] text-white/80">
                    W
                  </kbd>
                  <span className="text-[10px] text-white/40">GAS</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <kbd className="rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[13px] text-white/80">
                    S
                  </kbd>
                  <span className="text-[10px] text-white/40">BRAKE</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <kbd className="rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[13px] text-white/80">
                    A/D
                  </kbd>
                  <span className="text-[10px] text-white/40">STEER</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <kbd className="rounded border border-[#ff4400]/40 bg-[#ff4400]/10 px-3 py-1.5 font-mono text-[13px] text-[#ff4400]">
                    SHIFT
                  </kbd>
                  <span className="text-[10px] text-[#ff4400]/60">NITRO</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rev screen border glow */}
        {isRevving && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 80px rgba(255,68,0,0.15), inset 0 0 200px rgba(255,68,0,0.05)',
            }}
          />
        )}
      </div>
    </div>
  )
}