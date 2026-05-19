export type VehicleCategory =
  | 'sedan'
  | 'suv'
  | 'sports'
  | 'muscle'
  | 'truck'
  | 'electric'

export interface VehicleCategoryMeta {
  label: string
  description: string
}

export const VEHICLE_CATEGORIES: Record<VehicleCategory, VehicleCategoryMeta> = {
  sedan:    { label: 'Sedan',         description: 'Classic 4-door saloon' },
  suv:      { label: 'SUV/Crossover', description: 'Sport utility vehicle' },
  sports:   { label: 'Sports Coupe',  description: 'High-performance 2-door' },
  muscle:   { label: 'Muscle Car',    description: 'American V8 power' },
  truck:    { label: 'Pickup Truck',  description: 'Full-size utility truck' },
  electric: { label: 'Electric',      description: 'Battery electric vehicle' },
}
