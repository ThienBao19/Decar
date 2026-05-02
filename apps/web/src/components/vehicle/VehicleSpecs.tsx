import type { EngineDTO } from '@decar/shared'

interface Props {
  engine: EngineDTO
}

export function VehicleSpecs({ engine }: Props) {
  const hp = Math.round(engine.powerKw * 1.34102)
  const lbFt = Math.round(engine.torqueNm * 0.737562)

  const specs = [
    { label: 'Engine', value: `${engine.displacement}L ${engine.cylinders}-cyl` },
    { label: 'Fuel', value: engine.fuelType },
    { label: 'Power', value: `${engine.powerKw} kW (${hp} hp)` },
    { label: 'Torque', value: `${engine.torqueNm} Nm (${lbFt} lb-ft)` },
    { label: 'Transmission', value: engine.transmission },
    { label: 'Drivetrain', value: engine.drivetrain },
  ]

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Engine & Drivetrain</h2>
      <dl className="divide-y divide-gray-100 rounded-xl border border-gray-100">
        {specs.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
