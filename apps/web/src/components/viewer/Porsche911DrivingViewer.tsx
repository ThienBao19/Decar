'use client'
import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { createDrivingState, createKeyState, handleKeyDown, handleKeyUp, updateDriving, applyToCarGroup, updateChaseCamera, type DrivingState, type KeyState } from './porsche911/driving-controls'
import { buildRig } from './drive-map/scene-builder'
const KEYS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space']
interface Props { className?: string; make?: string; model?: string; bodyType?: string | null; bodyColor?: number; onSpeedChange?: (s: number) => void; onRevChange?: (r: boolean) => void; onDriftChange?: (d: boolean) => void }
export function Porsche911DrivingViewer({ className, make, model, bodyType, bodyColor, onSpeedChange, onRevChange, onDriftChange }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const handleClick = useCallback(() => mountRef.current?.focus(), [])
  useEffect(() => {
    const el = mountRef.current; if (!el) return
    const rig = buildRig(el, bodyColor, make, model, bodyType); const { renderer, scene, car, grid, dir, exhaust, sparks } = rig
    const focused: [boolean] = [false]; const ds: [DrivingState] = [createDrivingState()]; const ks: [KeyState] = [createKeyState()]
    const cp: [THREE.Vector3] = [new THREE.Vector3(0, 3, -8)]; const cl: [THREE.Vector3] = [new THREE.Vector3(0, 1, 4)]
    const cam: [THREE.PerspectiveCamera] = [new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.5, 200)]
    cam[0].position.copy(cp[0])
    const raf: [number] = [0]; const ht: [number] = [0]; const gt: [number] = [0]; const rt: [ReturnType<typeof setTimeout> | null] = [null]
    const onFocus = () => { focused[0] = true }; const onBlur = () => { focused[0] = false }
    el.addEventListener('focus', onFocus); el.addEventListener('blur', onBlur)
    const onKD = (e: KeyboardEvent) => { if (!focused[0]) return; if (KEYS.includes(e.code)) e.preventDefault(); ks[0] = handleKeyDown(ks[0], e.code) }
    const onKU = (e: KeyboardEvent) => { ks[0] = handleKeyUp(ks[0], e.code) }
    window.addEventListener('keydown', onKD); window.addEventListener('keyup', onKU)
    const clock = new THREE.Clock()
    const animate = () => {
      raf[0] = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      ds[0] = updateDriving(ds[0], ks[0], dt); const s = ds[0]; applyToCarGroup(car, s, dt)
      if (s.nitroBoost > 0.05) { exhaust.trigger(s.nitroBoost); exhaust.update(new THREE.Vector3(s.posX, 0, s.posZ), s.heading, s.speed, dt) } else { exhaust.stop(); exhaust.update(new THREE.Vector3(s.posX, 0, s.posZ), s.heading, s.speed, dt) }
      if (s.isDrifting && s.driftIntensity > 0.1) { const rz = s.posZ - Math.cos(s.heading + Math.PI / 2) * 1.35; sparks.spawn(s.posX + Math.cos(s.heading) * 0.88, rz, s.heading, s.driftIntensity); sparks.spawn(s.posX - Math.cos(s.heading) * 0.88, rz, s.heading, s.driftIntensity) }
      sparks.update(dt)
      gt[0] += dt; if (gt[0] > 0.1) { gt[0] = 0; grid.position.set(s.posX, -0.45, s.posZ) }
      dir.position.set(s.posX + 5, 10, s.posZ + 5)
      const { camPos, camLook } = updateChaseCamera(cam[0], s, cp[0], cl[0], dt); cp[0] = camPos; cl[0] = camLook
      if (s.nitroBoost > 0.3) cam[0].position.add(new THREE.Vector3((Math.random() - 0.5) * 0.025 * s.nitroBoost, (Math.random() - 0.5) * 0.015 * s.nitroBoost, 0))
      renderer.render(scene, cam[0])
      ht[0] += dt; if (ht[0] > 0.12) { ht[0] = 0; onSpeedChange?.(Math.abs(Math.round(s.speed * 3.6))); onRevChange?.(s.isRevving); onDriftChange?.(s.isDrifting) }
    }
    animate()
    const obs = new ResizeObserver(() => { if (rt[0]) clearTimeout(rt[0]); rt[0] = setTimeout(() => { if (!el) return; renderer.setSize(el.clientWidth, el.clientHeight); const nc = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.5, 200); nc.position.copy(cp[0]); cam[0] = nc }, 100) })
    obs.observe(el)
    return () => { cancelAnimationFrame(raf[0]); if (rt[0]) clearTimeout(rt[0]); el.removeEventListener('focus', onFocus); el.removeEventListener('blur', onBlur); window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU); obs.disconnect(); rig.dispose() }
  }, [onSpeedChange, onRevChange, onDriftChange, bodyColor, make, model, bodyType])
  return <div ref={mountRef} className={className ?? 'w-full h-full'} tabIndex={0} onClick={handleClick} style={{ outline: 'none', cursor: 'pointer' }} />
}
