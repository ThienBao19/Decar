// Enrichment stores 0 when a source has no figure, so 0 means "unknown", not zero output
export function formatPower(powerKw: number): string {
  if (powerKw <= 0) return '—'
  return `${powerKw} kW (${Math.round(powerKw * 1.34102)} hp)`
}

export function formatTorque(torqueNm: number): string {
  if (torqueNm <= 0) return '—'
  return `${torqueNm} Nm (${Math.round(torqueNm * 0.737562)} lb-ft)`
}
