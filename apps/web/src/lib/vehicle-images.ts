/**
 * Vehicle image service — imagin.studio CDN (free renders by make/model/year).
 */

const BASE = 'https://cdn.imagin.studio/getimage'

const MAKE_MAP: Record<string, string> = {
  'MERCEDES-BENZ': 'mercedes', 'MERCEDES BENZ': 'mercedes',
  'LAND ROVER': 'land-rover', 'ALFA ROMEO': 'alfa-romeo',
  'ASTON MARTIN': 'aston-martin', 'ROLLS-ROYCE': 'rolls-royce',
}

const normMake = (m: string) => MAKE_MAP[m.toUpperCase().trim()] ?? m.toLowerCase().replace(/\s+/g, '-')
const normModel = (m: string) => m.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')

export function getVehicleImageUrl(make: string, model: string, year: number, angle = '01', width = 800): string {
  const p = new URLSearchParams({
    customer: 'img', make: normMake(make), modelFamily: normModel(model),
    modelYear: String(year), angle, width: String(width), paintId: 'pspc0040',
  })
  return `${BASE}?${p.toString()}`
}

export function getVehicleThumbnailUrl(make: string, model: string, year: number): string {
  return getVehicleImageUrl(make, model, year, '01', 600)
}

type GalleryItem = { url: string; label: string }
const ANGLES: ReadonlyArray<[string, string]> = [
  ['01', 'Front 3/4'], ['09', 'Side'], ['13', 'Rear 3/4'],
  ['17', 'Rear'], ['21', 'Front'], ['29', 'Interior'],
]

export function getVehicleGalleryUrls(make: string, model: string, year: number): ReadonlyArray<GalleryItem> {
  return ANGLES.map(([angle, label]) => ({ url: getVehicleImageUrl(make, model, year, angle, 1200), label }))
}
