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
      a: vehicleA.engine ? `${vehicleA.engine.powerKw} kW` : '—',
      b: vehicleB.engine ? `${vehicleB.engine.powerKw} kW` : '—',
    },
    {
      label: 'Torque',
      a: vehicleA.engine ? `${vehicleA.engine.torqueNm} Nm` : '—',
      b: vehicleB.engine ? `${vehicleB.engine.torqueNm} Nm` : '—',
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
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="py-3 pl-4 text-left text-xs font-medium uppercase text-gray-400">
              Spec
            </th>
            <th className="py-3 px-4 text-center text-xs font-medium uppercase text-gray-400">
              {vehicleA.year} {vehicleA.make} {vehicleA.model}
            </th>
            <th className="py-3 px-4 text-center text-xs font-medium uppercase text-gray-400">
              {vehicleB.year} {vehicleB.make} {vehicleB.model}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(({ label, a, b }) => (
            <tr key={label} className="hover:bg-gray-50">
              <td className="py-3 pl-4 font-medium text-gray-600">{label}</td>
              <td className="py-3 px-4 text-center text-gray-900">{a}</td>
              <td className="py-3 px-4 text-center text-gray-900">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
