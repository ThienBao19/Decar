import type { EngineDTO } from '@decar/shared'

interface Props {
  engine: EngineDTO
  isPro?: boolean
}

export function VehicleSpecs({ engine, isPro = false }: Props) {
  const hp = isPro ? Math.round(engine.powerKw * 1.34102) : 0
  const lbFt = isPro ? Math.round(engine.torqueNm * 0.737562) : 0

  const specs = [
    { label: 'Engine', value: `${engine.displacement}L ${engine.cylinders}-cyl`, gated: false },
    { label: 'Fuel', value: engine.fuelType, gated: false },
    { label: 'Drivetrain', value: engine.drivetrain, gated: false },
    {
      label: 'Power',
      value: isPro ? `${engine.powerKw} kW (${hp} hp)` : '—',
      gated: !isPro,
    },
    {
      label: 'Torque',
      value: isPro ? `${engine.torqueNm} Nm (${lbFt} lb-ft)` : '—',
      gated: !isPro,
    },
    {
      label: 'Transmission',
      value: isPro ? engine.transmission : '—',
      gated: !isPro,
    },
  ]

  return (
    <div>
      <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Engine &amp; Drivetrain</h2>
      <dl className="divide-y divide-[#242424] rounded-xl border border-[#2e2e2e] bg-[#1c1c1c]">
        {specs.map(({ label, value, gated }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 text-[13px]">
            <dt className="text-[#898989]">{label}</dt>
            <dd className={gated ? 'text-[#4d4d4d]' : 'font-medium text-[#fafafa]'}>
              {gated ? (
                <span className="flex items-center gap-1">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                    <rect x="1" y="5" width="8" height="7" rx="1.5" stroke="#4d4d4d" strokeWidth="1.2" />
                    <path d="M3 5V3.5a2 2 0 0 1 4 0V5" stroke="#4d4d4d" strokeWidth="1.2" />
                  </svg>
                  Pro
                </span>
              ) : value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
