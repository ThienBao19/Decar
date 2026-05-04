import Link from 'next/link'

interface Props {
  label: string
  description?: string
}

export function UpgradeGate({ label, description }: Props) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#1c1c1c]">
      {/* Blurred ghost content */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="h-full w-full bg-[repeating-linear-gradient(45deg,#242424_0px,#242424_1px,transparent_1px,transparent_12px)] opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-10">
            <rect x="10" y="30" width="60" height="35" rx="6" stroke="#fafafa" strokeWidth="2" />
            <circle cx="22" cy="65" r="9" stroke="#fafafa" strokeWidth="2" />
            <circle cx="58" cy="65" r="9" stroke="#fafafa" strokeWidth="2" />
            <path d="M10 40 L25 25 L55 25 L70 40" stroke="#fafafa" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Frosted overlay */}
      <div className="absolute inset-0 bg-[#0f0f0f]/70 backdrop-blur-[2px]" />

      {/* CTA */}
      <div className="relative flex flex-col items-center gap-4 px-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[#fafafa]">{label}</p>
          <p className="mt-1 text-[13px] text-[#898989]">
            {description ?? 'Available on Pro — upgrade for full access.'}
          </p>
        </div>
        <Link
          href="/pricing"
          className="rounded-[9999px] bg-[#3ecf8e] px-5 py-2 text-[13px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  )
}
