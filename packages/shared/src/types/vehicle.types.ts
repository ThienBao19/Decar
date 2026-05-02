export type SubscriptionTier = 'FREE' | 'PRO'

export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'HYDROGEN'

export type MediaType =
  | 'EXTERIOR_IMAGE'
  | 'INTERIOR_IMAGE'
  | 'ENGINE_IMAGE'
  | 'EXTERIOR_3D'
  | 'INTERIOR_3D'
  | 'ENGINE_3D'

export interface ColorDTO {
  id: string
  name: string
  hexCode: string
  isPrimary: boolean
}

export interface EngineDTO {
  displacement: number
  cylinders: number
  fuelType: FuelType
  powerKw: number
  torqueNm: number
  transmission: string
  drivetrain: string
}

export interface ExteriorDTO {
  bodyType: string
  lengthMm: number
  widthMm: number
  heightMm: number
  wheelbaseMm: number
  colors: ColorDTO[]
}

export interface InteriorDTO {
  seatMaterial: string
  seatRows: number
  seatCount: number
  dashboard: string
  techFeatures: string[]
}

export interface MediaDTO {
  id: string
  type: MediaType
  isPro: boolean
  sortOrder: number
}

export interface VehicleListItemDTO {
  id: string
  slug: string
  make: string
  model: string
  year: number
  market: string
  trimLevel: string | null
  bodyType: string | null
  thumbnailUrl: string | null
}

export interface VehicleDetailDTO {
  id: string
  slug: string
  make: string
  model: string
  year: number
  market: string
  trimLevel: string | null
  engine: EngineDTO | null
  exterior: ExteriorDTO | null
  interior: InteriorDTO | null
  media: MediaDTO[]
}

export interface VehicleSearchParams {
  make?: string
  model?: string
  year?: number
  fuelType?: FuelType
  bodyType?: string
  market?: string
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
