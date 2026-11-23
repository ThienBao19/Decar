import type { VehicleCategory } from './vehicle-base.types'

export type PartCategory =
  | 'wheel'
  | 'front_bumper'
  | 'rear_bumper'
  | 'spoiler'
  | 'side_skirts'
  | 'hood'
  | 'exhaust'
  | 'headlight'
  | 'taillight'
  | 'brake_caliper'

export type PartTier = 'oem' | 'aftermarket' | 'premium' | 'legendary'

export type WheelFinish = 'gloss' | 'matte' | 'chrome' | 'carbon' | 'brushed'

export type PaintFinish = 'metallic' | 'pearl' | 'matte' | 'gloss' | 'satin'

export type WrapType =
  | 'carbon'
  | 'chrome'
  | 'vinyl-gloss'
  | 'vinyl-matte'
  | 'brushed-metal'
  | 'camouflage'
  | 'livery'

export type WindowTint = 0 | 5 | 20 | 35 | 50

export interface PartDef {
  id: string
  name: string
  category: PartCategory
  tier: PartTier
  description?: string
  weight?: number
  dragCoefficient?: number
  downforce?: number
  gripMultiplier?: number
}

export interface WheelPartDef extends PartDef {
  category: 'wheel'
  rimDiameter: 18 | 19 | 20 | 21
  finish: WheelFinish
}

export interface PaintConfig {
  bodyColor: number
  finish: PaintFinish
  roofColor?: number
  wrapType?: WrapType | null
  windowTint: WindowTint
}

export interface BuildConfig {
  name: string
  baseBodyCategory: VehicleCategory
  parts: Partial<Record<PartCategory, string>>
  paint: PaintConfig
}

export interface VehicleBuildDTO {
  id: string
  name: string
  config: BuildConfig
  thumbnail?: string | null
  isPublic: boolean
  isOwner?: boolean
  createdAt: string
  updatedAt: string
}

export interface SlotPosition {
  x: number
  y: number
  z: number
}

export interface SlotMap {
  wheel_FL: SlotPosition
  wheel_FR: SlotPosition
  wheel_RL: SlotPosition
  wheel_RR: SlotPosition
  front_bumper: SlotPosition
  rear_bumper: SlotPosition
  spoiler: SlotPosition
  side_skirt_L: SlotPosition
  side_skirt_R: SlotPosition
  hood: SlotPosition
  exhaust_L: SlotPosition
  exhaust_R: SlotPosition
  headlight_L: SlotPosition
  headlight_R: SlotPosition
}

export interface CreateBuildRequest {
  name: string
  config: BuildConfig
  thumbnail?: string
}

export interface UpdateBuildRequest {
  name?: string
  config?: BuildConfig
  thumbnail?: string
  isPublic?: boolean
}
