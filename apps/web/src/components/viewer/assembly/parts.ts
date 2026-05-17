export type PartType = 'wheel' | 'spoiler'
export interface PartDef {
  id: string; make: string; label: string
  type: PartType; color: number; params: Record<string, number>
}
export const CATALOG: PartDef[] = [
  { id: 'cadillac-w', make: 'Cadillac', label: 'Cadillac 20in Chrome', type: 'wheel', color: 0xdddddd, params: { r: 0.42, spokes: 5 } },
  { id: 'audi-w', make: 'Audi', label: 'Audi RS 19in Alloy', type: 'wheel', color: 0x999999, params: { r: 0.38, spokes: 10 } },
  { id: 'bmw-w', make: 'BMW', label: 'BMW M 18in Star', type: 'wheel', color: 0x333333, params: { r: 0.36, spokes: 8 } },
  { id: 'ford-w', make: 'Ford', label: 'Ford GT 17in Black', type: 'wheel', color: 0x111111, params: { r: 0.34, spokes: 6 } },
  { id: 'merc-w', make: 'Mercedes', label: 'AMG 21in Turbine', type: 'wheel', color: 0xc0c0c0, params: { r: 0.44, spokes: 12 } },
  { id: 'no-sp', make: 'Stock', label: 'No Spoiler', type: 'spoiler', color: 0x222233, params: { h: 0 } },
  { id: 'audi-sp', make: 'Audi', label: 'Audi Lip Wing', type: 'spoiler', color: 0x111111, params: { h: 0.1, w: 1.4 } },
  { id: 'bmw-sp', make: 'BMW', label: 'BMW M Ducktail', type: 'spoiler', color: 0x111111, params: { h: 0.2, w: 1.65 } },
  { id: 'gt-sp', make: 'Ford', label: 'GT500 High Wing', type: 'spoiler', color: 0x880000, params: { h: 0.28, w: 1.55 } },
]
export const byType = (t: PartType) => CATALOG.filter(({ type }) => type === t)
export const DEFAULT_WHEEL = CATALOG[0] as PartDef
export const DEFAULT_SPOILER = (CATALOG.find(({ id }) => id === 'no-sp') ?? CATALOG[5]) as PartDef
