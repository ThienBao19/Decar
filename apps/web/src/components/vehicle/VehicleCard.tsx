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
      className="group rounded-xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-gray-100">
        {vehicle.thumbnailUrl ? (
          <Image
            src={vehicle.thumbnailUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-gray-300">🚗</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {vehicle.year} · {vehicle.market}
        </p>
        <h3 className="mt-1 font-semibold text-gray-900">
          {vehicle.make} {vehicle.model}
        </h3>
        {vehicle.trimLevel && (
          <p className="mt-0.5 text-sm text-gray-500">{vehicle.trimLevel}</p>
        )}
        {vehicle.bodyType && (
          <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {vehicle.bodyType}
          </span>
        )}
      </div>
    </Link>
  )
}
