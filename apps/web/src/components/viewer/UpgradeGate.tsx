import Link from 'next/link'

interface Props {
  label: string
}

export function UpgradeGate({ label }: Props) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-gray-100">
      {/* Blurred placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 blur-sm" />

      {/* Overlay */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow">
          Pro Feature
        </div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <Link
          href="/pricing"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  )
}
