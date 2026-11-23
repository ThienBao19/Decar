/**
 * Fueleconomy.gov API client - free, no API key needed.
 * Returns detailed vehicle specs: engine, transmission, fuel type, etc.
 * https://www.fueleconomy.gov/feg/ws/index.shtml
 */

const BASE = 'https://www.fueleconomy.gov/ws/rest/vehicle'

// -- Types --

export interface FuelEconOption {
  text: string
  value: string // vehicle ID
}

export interface FuelEconVehicle {
  atvType: string
  barrels08: string
  city08: string
  comb08: string
  cylinders: string
  displ: string
  drive: string
  fuelType: string
  fuelType1: string
  highway08: string
  hlv: string
  hpv: string
  id: string
  make: string
  model: string
  trany: string
  VClass: string
  year: string
  youSaveSpend: string
  [key: string]: string
}

// -- Fetch helpers --

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`fueleconomy.gov ${res.status}`)
  return res.json() as Promise<T>
}

// -- Public API --

/** Get vehicle option IDs for a specific make/model/year */
export async function getVehicleOptions(
  make: string,
  model: string,
  year: number,
): Promise<FuelEconOption[]> {
  const url = `${BASE}/menu/options?make=${enc(make)}&model=${enc(model)}&year=${year}`
  try {
    const data = await fetchJSON<{ menuItem: FuelEconOption | FuelEconOption[] }>(url)
    if (!data.menuItem) return []
    return Array.isArray(data.menuItem) ? data.menuItem : [data.menuItem]
  } catch {
    return []
  }
}

/** Get full vehicle specs by fueleconomy.gov vehicle ID */
export async function getVehicleById(id: string): Promise<FuelEconVehicle | null> {
  try {
    return await fetchJSON<FuelEconVehicle>(`${BASE}/${id}`)
  } catch {
    return null
  }
}

/** Get specs for a make/model/year (picks the first trim available) */
export async function getVehicleSpecs(
  make: string,
  model: string,
  year: number,
): Promise<FuelEconVehicle | null> {
  const options = await getVehicleOptions(make, model, year)
  const first = options[0]
  if (!first) return null

  // Get the first option's full specs
  return getVehicleById(first.value)
}

/** Get specs for ALL trims of a make/model/year */
export async function getAllTrimSpecs(
  make: string,
  model: string,
  year: number,
): Promise<FuelEconVehicle[]> {
  const options = await getVehicleOptions(make, model, year)
  if (options.length === 0) return []

  // Fetch up to 5 trims to avoid rate limiting
  const trimIds = options.slice(0, 5).map((o: FuelEconOption) => o.value)
  const results = await Promise.all(trimIds.map((id) => getVehicleById(id)))
  return results.filter((v): v is FuelEconVehicle => v !== null)
}

// -- Parsed specs --

export interface ParsedVehicleSpecs {
  displacement: number | null
  cylinders: number | null
  fuelType: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'HYDROGEN'
  horsepower: number | null
  transmission: string | null
  drivetrain: string | null
  bodyType: string | null
  cityMpg: number | null
  highwayMpg: number | null
  combinedMpg: number | null
}

export function parseSpecs(v: FuelEconVehicle): ParsedVehicleSpecs {
  return {
    displacement: v.displ ? parseFloat(v.displ) : null,
    cylinders: v.cylinders ? parseInt(v.cylinders, 10) : null,
    fuelType: mapFuel(v.fuelType1 || v.fuelType),
    horsepower: null, // fueleconomy.gov does not provide HP directly
    transmission: v.trany || null,
    drivetrain: v.drive || null,
    bodyType: v.VClass || null,
    cityMpg: v.city08 ? parseInt(v.city08, 10) : null,
    highwayMpg: v.highway08 ? parseInt(v.highway08, 10) : null,
    combinedMpg: v.comb08 ? parseInt(v.comb08, 10) : null,
  }
}

function mapFuel(fuel: string): 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'HYDROGEN' {
  if (!fuel) return 'PETROL'
  const lower = fuel.toLowerCase()
  if (lower.includes('diesel')) return 'DIESEL'
  if (lower.includes('electricity') && !lower.includes('gasoline')) return 'ELECTRIC'
  if (lower.includes('electricity') && lower.includes('gasoline')) return 'HYBRID'
  if (lower.includes('hydrogen')) return 'HYDROGEN'
  return 'PETROL'
}

function enc(s: string): string {
  return encodeURIComponent(s)
}