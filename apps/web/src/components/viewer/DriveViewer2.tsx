'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'

import {
  createDrivingState, createKeyState, handleKeyDown, handleKeyUp, updateDriving, applyToCarGroup, updateChaseCamera,
} from './porsche911/driving-controls'
import { buildRig, type DriveSource } from './drive-map/scene-builder'

const KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Space']
const HUD_INTERVAL_S = 0.12
const FOV = 50

interface Props {
  className?: string
  source: DriveSource
  onSpeedChange?: (kmh: number) => void
  onRevChange?: (isRevving: boolean) => void
  onDriftChange?: (isDrifting: boolean) => void
}

export function DriveViewer2({ className, source, onSpeedChange, onRevChange, onDriftChange }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [hasFailed, setHasFailed] = useState(false)
  const handleClick = useCallback(() => mountRef.current?.focus(), [])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const rig = buildRig(el, source, () => setHasFailed(true))
    const camera = new THREE.PerspectiveCamera(FOV, el.clientWidth / el.clientHeight, 0.3, 1000)
    let state = createDrivingState()
    let keys = createKeyState()
    let camPos = new THREE.Vector3(0, 3, -8)
    let camLook = new THREE.Vector3(0, 1, 4)
    let isFocused = false
    let hudTimer = 0
    let raf = 0
    camera.position.copy(camPos)

    const onFocus = () => { isFocused = true }
    const onBlur = () => { isFocused = false }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return
      if (KEYS.includes(e.code)) e.preventDefault()
      keys = handleKeyDown(keys, e.code)
    }
    const onKeyUp = (e: KeyboardEvent) => { keys = handleKeyUp(keys, e.code) }
    el.addEventListener('focus', onFocus)
    el.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const clock = new THREE.Clock()
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      state = updateDriving(state, keys, dt)
      applyToCarGroup(rig.car, state, dt)
      rig.updateWheels(state.speed, state.steerAngle, dt)
      rig.follow(state.posX, state.posZ)

      const carPos = new THREE.Vector3(state.posX, 0, state.posZ)
      if (state.nitroBoost > 0.05) rig.exhaust.trigger(state.nitroBoost)
      else rig.exhaust.stop()
      rig.exhaust.update(carPos, state.heading, state.speed, dt)
      if (state.isDrifting && state.driftIntensity > 0.1) {
        const rearZ = state.posZ - Math.cos(state.heading + Math.PI / 2) * 1.35
        rig.sparks.spawn(state.posX + Math.cos(state.heading) * 0.88, rearZ, state.heading, state.driftIntensity)
        rig.sparks.spawn(state.posX - Math.cos(state.heading) * 0.88, rearZ, state.heading, state.driftIntensity)
      }
      rig.sparks.update(dt)

      ;({ camPos, camLook } = updateChaseCamera(camera, state, camPos, camLook, dt))
      rig.renderer.render(rig.scene, camera)

      hudTimer += dt
      if (hudTimer > HUD_INTERVAL_S) {
        hudTimer = 0
        onSpeedChange?.(Math.abs(Math.round(state.speed * 3.6)))
        onRevChange?.(state.isRevving)
        onDriftChange?.(state.isDrifting)
      }
    }
    animate()

    const observer = new ResizeObserver(() => {
      rig.renderer.setSize(el.clientWidth, el.clientHeight)
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
    })
    observer.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('focus', onFocus)
      el.removeEventListener('blur', onBlur)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      observer.disconnect()
      rig.dispose()
    }
  }, [source, onSpeedChange, onRevChange, onDriftChange])

  return (
    <div className='relative h-full w-full'>
      <div ref={mountRef} className={className ?? 'h-full w-full'} tabIndex={0} onClick={handleClick} style={{ outline: 'none', cursor: 'pointer' }} />
      {hasFailed && (
        <div className='absolute inset-0 flex items-center justify-center text-[13px] text-[#898989]'>
          The 3D model could not be loaded.
        </div>
      )}
    </div>
  )
}