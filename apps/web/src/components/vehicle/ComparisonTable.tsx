import type { VehicleDetailDTO } from '@decar/shared'

interface Props {
  vehicleA: VehicleDetailDTO
  vehicleB: VehicleDetailDTO
}

export function ComparisonTable({ vehicleA, vehicleB }: Props) {
  const rows = [
    {
      label: 'Engine',
      a: vehicleA.engine ? `${vehicleA.engine.displacement}L ${vehicleA.engine.cylinders}-cyl` : '—',
      b: vehicleB.engine ? `${vehicleB.engine.displacement}L ${vehicleB.engine.cylinders}-cyl` : '—',
    },
    {
      label: 'Fuel',
      a: vehicleA.engine?.fuelType ?? '—',
      b: vehicleB.engine?.fuelType ?? '—',
    },
    {
      label: 'Power',
      a: vehicleA.engine?.powerKw ? `${vehicleA.engine.powerKw} kW` : '—',
      b: vehicleB.engine?.powerKw ? `${vehicleB.engine.powerKw} kW` : '—',
    },
    {
      label: 'Torque',
      a: vehicleA.engine?.torqueNm ? `${vehicleA.engine.torqueNm} Nm` : '—',
      b: vehicleB.engine?.torqueNm ? `${vehicleB.engine.torqueNm} Nm` : '—',
    },
    {
      label: 'Body',
      a: vehicleA.exterior?.bodyType ?? '—',
      b: vehicleB.exterior?.bodyType ?? '—',
    },
    {
      label: 'Seats',
      a: vehicleA.interior ? `${vehicleA.interior.seatCount}` : '—',
      b: vehicleB.interior ? `${vehicleB.interior.seatCount}` : '—',
    },
  ]

  return (
    <div className="overflow-x-auto rounded-xl border border-[#2e2e2e]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#242424] bg-[#1c1c1c]">
            <th className="py-3 pl-4 text-left text-[11px] font-medium uppercase tracking-widest text-[#4d4d4d]">
              Spec
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[#4d4d4d]">
              {vehicleA.year} {vehicleA.make} {vehicleA.model}
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[#4d4d4d]">
              {vehicleB.year} {vehicleB.make} {vehicleB.model}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#242424] bg-[#171717]">
          {rows.map(({ label, a, b }) => (
            <tr key={label} className="transition-colors hover:bg-[#1c1c1c]">
              <td className="py-3 pl-4 font-medium text-[#898989]">{label}</td>
              <td className="px-4 py-3 text-center text-[#fafafa]">{a}</td>
              <td className="px-4 py-3 text-center text-[#fafafa]">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
