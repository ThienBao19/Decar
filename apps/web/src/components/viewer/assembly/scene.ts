import * as THREE from 'three'
import { buildCarBody, buildPart } from './build'
import { DEFAULT_WHEEL, DEFAULT_SPOILER } from './parts'
import type { PartDef } from './parts'
const WP: [number, number, number][] = [[-0.92, 0.08, 1.55], [0.92, 0.08, 1.55], [-0.92, 0.08, -1.45], [0.92, 0.08, -1.45]]
export interface SceneHandle { swapWheels(d: PartDef): void; swapSpoiler(d: PartDef): void; dispose(): void }
export function setupAssemblyScene(el: HTMLDivElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth, el.clientHeight)
  el.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  renderer.setClearColor(0x0f1520)
  scene.add(new THREE.AmbientLight(0xffffff, 1.4))
  const key = new THREE.DirectionalLight(0xfff4e0, 2.5); key.position.set(5, 8, 6); scene.add(key)
  const fill = new THREE.DirectionalLight(0x4466cc, 1.2); fill.position.set(-6, 3, -4); scene.add(fill)
  const rim = new THREE.DirectionalLight(0x88ffcc, 0.9); rim.position.set(0, -2, -8); scene.add(rim)
  const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 100)
  camera.position.set(3.5, 2.2, 5.5); camera.lookAt(0, 0.5, 0)
  const car = new THREE.Group(); car.add(buildCarBody()); scene.add(car)
  const wheels: THREE.Group[] = WP.map(([x, y, z]) => {
    const w = buildPart(DEFAULT_WHEEL); w.position.set(x, y, z); car.add(w); return w
  })
  const sp: [THREE.Group] = [buildPart(DEFAULT_SPOILER)]; sp[0].position.set(0, 0.7, -2.05); car.add(sp[0])
  const raf: [number] = [0]; const clock = new THREE.Clock()
  const animate = () => { raf[0] = requestAnimationFrame(animate); car.rotation.y += clock.getDelta() * 0.4; renderer.render(scene, camera) }
  animate()
  return {
    swapWheels(def: PartDef) {
      wheels.forEach((old, i) => {
        const nw = buildPart(def); nw.position.copy(old.position)
        car.remove(old); car.add(nw); wheels[i] = nw
      })
    },
    swapSpoiler(def: PartDef) {
      car.remove(sp[0]); const ns = buildPart(def)
      ns.position.set(0, 0.7, -2.05); car.add(ns); sp[0] = ns
    },
    dispose() { cancelAnimationFrame(raf[0]); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement) },
  }
}
