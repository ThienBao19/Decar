import type { SlotMap, VehicleCategory } from '@decar/shared'
import type * as THREE from 'three'

type BodyModule = {
  buildBody(color?: number): THREE.Group
  getSlotPositions(): SlotMap
}

const REGISTRY: Record<VehicleCategory, () => Promise<BodyModule>> = {
  sedan:    () => import('./sedan'),
  suv:      () => import('./suv-crossover'),
  sports:   () => import('./sports-coupe'),
  muscle:   () => import('./muscle'),
  truck:    () => import('./truck'),
  electric: () => import('./electric-hatch'),
}

export async function loadBody(category: VehicleCategory): Promise<BodyModule> {
  return REGISTRY[category]()
}

export function categoryFromMake(make: string, model: string, bodyType?: string | null): VehicleCategory {
  const key = (make + ' ' + model).toLowerCase()
  const bt  = (bodyType ?? '').toLowerCase()
  if (key.includes('tesla') || key.includes('ioniq') || key.includes('leaf') || key.includes('bolt')
      || bt.includes('electric')) return 'electric'
  if (key.includes('mustang') || key.includes('challenger') || key.includes('charger')
      || key.includes('camaro') || key.includes('corvette')) return 'muscle'
  if (bt.includes('truck') || bt.includes('pickup') || key.includes('f-150')
      || key.includes('silverado') || key.includes('tacoma') || key.includes('tundra')) return 'truck'
  if (bt.includes('sport utility') || bt.includes('suv') || bt.includes('crossover')
      || key.includes('escape') || key.includes('rav4') || key.includes('pilot')) return 'suv'
  if (key.includes('911') || key.includes('cayman') || key.includes('boxster')
      || key.includes('m4') || key.includes('488') || key.includes('720s')) return 'sports'
  return 'sedan'
}
