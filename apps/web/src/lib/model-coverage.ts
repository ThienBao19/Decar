import { listStudioModels, resolveStudioModel, type ModelEntry } from './model-registry'

// Which vehicles show a 3D model and which only photos, grouped by make and model
// so an admin can see which generations still need one (docs/models.md, phase D)

export interface CoverageVehicle {
  id: string
  make: string
  model: string
  year: number
  assignment: { assetId: string | null } | null
}

// Consecutive model years with the same outcome; assetId null means photos only
export interface YearRun {
  from: number
  to: number
  assetId: string | null
}

export interface ModelGroup {
  make: string
  model: string
  vehicleCount: number
  coveredCount: number
  runs: YearRun[]
}

export interface AssetUsage {
  entry: ModelEntry
  automatic: number
  assigned: number
}

export interface Coverage {
  groups: ModelGroup[]
  usage: AssetUsage[]
}

// Within one year, trims can resolve differently; a year counts as covered if any does
function yearRuns(byYear: Map<number, string | null>): YearRun[] {
  const runs: YearRun[] = []
  for (const year of [...byYear.keys()].sort((a, b) => a - b)) {
    const assetId = byYear.get(year) ?? null
    const last = runs.at(-1)
    if (last && last.to === year - 1 && last.assetId === assetId) runs[runs.length - 1] = { ...last, to: year }
    else runs.push({ from: year, to: year, assetId })
  }
  return runs
}

interface GroupAcc {
  make: string
  model: string
  vehicleCount: number
  coveredCount: number
  byYear: Map<number, string | null>
}

export function buildCoverage(vehicles: CoverageVehicle[]): Coverage {
  const groups = new Map<string, GroupAcc>()
  const usage = new Map(listStudioModels().map((entry) => [entry.id, { entry, automatic: 0, assigned: 0 }]))

  for (const v of vehicles) {
    const resolved = resolveStudioModel(v, v.assignment)
    const key = `${v.make} ${v.model}`.toLowerCase()
    const acc = groups.get(key) ?? { make: v.make, model: v.model, vehicleCount: 0, coveredCount: 0, byYear: new Map<number, string | null>() }
    groups.set(key, {
      ...acc,
      vehicleCount: acc.vehicleCount + 1,
      coveredCount: acc.coveredCount + (resolved ? 1 : 0),
      byYear: new Map(acc.byYear).set(v.year, acc.byYear.get(v.year) || resolved?.id || null),
    })
    const use = resolved && usage.get(resolved.id)
    if (use) usage.set(use.entry.id, v.assignment ? { ...use, assigned: use.assigned + 1 } : { ...use, automatic: use.automatic + 1 })
  }

  const sorted = [...groups.values()]
    .map(({ byYear, ...g }) => ({ ...g, runs: yearRuns(byYear) }))
    .sort((a, b) => b.vehicleCount - a.vehicleCount || `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))
  return { groups: sorted, usage: [...usage.values()] }
}