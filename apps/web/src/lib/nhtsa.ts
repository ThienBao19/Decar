/**
 * NHTSA vPIC API client - free, unlimited, no API key needed.
 * https://vpic.nhtsa.dot.gov/api/
 */

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

// -- Types --

export interface NHTSAMake {
  Make_ID: number
  Make_Name: string
}

export interface NHTSAModel {
  Make_ID: number
  Make_Name: string
  Model_ID: number
  Model_Name: string
}

export interface NHTSADecodedVar {
  VariableId: number
  Variable: string
  ValueId: string | null
  Value: string | null
}

interface NHTSAResponse<T> {
  Count: number
  Message: string
  SearchCriteria: string | null
  Results: T[]
}

// -- Fetch helper --

async function fetchNHTSA<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}${path}${sep}format=json`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) {
    throw new Error(`NHTSA API ${res.status}: ${res.statusText}`)
  }
  const json = (await res.json()) as NHTSAResponse<T>
  return json.Results ?? []
}

// -- Public API --

export async function getAllMakes(): Promise<NHTSAMake[]> {
  return fetchNHTSA<NHTSAMake>('/GetAllMakes')
}

export async function getModelsForMakeYear(
  make: string,
  year: number,
): Promise<NHTSAModel[]> {
  return fetchNHTSA<NHTSAModel>(
    `/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}`,
  )
}

export async function getModelsForMake(make: string): Promise<NHTSAModel[]> {
  return fetchNHTSA<NHTSAModel>(
    `/GetModelsForMake/${encodeURIComponent(make)}`,
  )
}

export async function decodeVinValues(vin: string): Promise<Record<string, string>> {
  const results = await fetchNHTSA<Record<string, string>>(
    `/DecodeVinValues/${encodeURIComponent(vin)}`,
  )
  return results[0] ?? {}
}

export async function decodeVinBatch(vins: string[]): Promise<NHTSADecodedVar[]> {
  const url = `${BASE}/DecodeVINValuesBatch/`
  const body = new URLSearchParams({ format: 'json', data: vins.join(';') })
  const res = await fetch(url, { method: 'POST', body })
  if (!res.ok) throw new Error(`NHTSA batch ${res.status}`)
  const json = (await res.json()) as NHTSAResponse<NHTSADecodedVar>
  return json.Results ?? []
}

// -- Spec parser --

export interface ParsedSpecs {
  make: string
  model: string
  year: number
  trim: string | null
  bodyClass: string | null
  driveType: string | null
  fuelType: string | null
  cylinders: number | null
  displacementL: number | null
  horsepower: number | null
  engineKW: number | null
  transmission: string | null
  doors: number | null
  plantCountry: string | null
  manufacturer: string | null
  vehicleType: string | null
}

export function parseVinData(d: Record<string, string>): ParsedSpecs {
  const str = (key: string): string | null => {
    const v = d[key]
    if (!v || v.trim() === '' || v === 'Not Applicable') return null
    return v.trim()
  }
  const num = (key: string): number | null => {
    const v = str(key)
    if (!v) return null
    const n = parseFloat(v)
    return Number.isNaN(n) ? null : n
  }

  return {
    make: str('Make') ?? '',
    model: str('Model') ?? '',
    year: num('ModelYear') ?? 0,
    trim: str('Trim'),
    bodyClass: str('BodyClass'),
    driveType: str('DriveType'),
    fuelType: str('FuelTypePrimary'),
    cylinders: num('EngineCylinders'),
    displacementL: num('DisplacementL'),
    horsepower: num('EngineHP'),
    engineKW: num('EngineKW'),
    transmission: str('TransmissionStyle'),
    doors: num('Doors'),
    plantCountry: str('PlantCountry'),
    manufacturer: str('Manufacturer'),
    vehicleType: str('VehicleType'),
  }
}