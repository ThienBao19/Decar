import * as THREE from 'three'
const G = 0x2a2a34
export function createGroundGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(800, 120, G, G)
  grid.position.set(0, -0.45, 0)
  return grid
}
