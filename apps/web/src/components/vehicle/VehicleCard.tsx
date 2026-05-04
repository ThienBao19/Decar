import Link from 'next/link'
import Image from 'next/image'
import type { VehicleListItemDTO } from '@decar/shared'

interface Props {
  vehicle: VehicleListItemDTO
}

export function VehicleCard({ vehicle }: Props) {
  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="group flex flex-col rounded-xl border border-[#2e2e2e] bg-[#1c1c1c] transition-colors hover:border-[#363636]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-[#171717]">
        {vehicle.thumbnailUrl ? (
          <Image
            src={vehicle.thumbnailUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg width="48" height="28" viewBox="0 0 500 220" fill="none" className="opacity-20">
              <path d="M60 155 L60 120 Q80 90 130 75 L210 58 Q250 48 290 58 L370 75 Q420 88 445 120 L445 155 A38 38 0 0 0 407 155 L170 155 A38 38 0 0 0 132 155 Z" stroke="#fafafa" strokeWidth="8" />
              <circle cx="380" cy="155" r="33" stroke="#fafafa" strokeWidth="8" />
              <circle cx="127" cy="155" r="33" stroke="#fafafa" strokeWidth="8" />
            </svg>
          </div>
        )}
        {vehicle.bodyType && (
          <span className="absolute left-2 top-2 rounded-full border border-[#2e2e2e] bg-[#0f0f0f]/80 px-2 py-0.5 text-[11px] text-[#898989]">
            {vehicle.bodyType}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#4d4d4d]">
          {vehicle.year} · {vehicle.market}
        </p>
        <h3 className="text-[15px] font-semibold text-[#fafafa]">
          {vehicle.make} {vehicle.model}
        </h3>
        {vehicle.trimLevel && (
          <p className="text-[13px] text-[#898989]">{vehicle.trimLevel}</p>
        )}
      </div>
    </Link>
  )
}
