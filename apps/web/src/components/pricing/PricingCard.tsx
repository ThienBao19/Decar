'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SubscriptionTier } from '@decar/shared'

interface Props {
  tier: SubscriptionTier
  price: number
  current: boolean
  features: string[]
  cta: string
  ctaHref?: string
  ctaAction?: 'checkout'
  highlighted?: boolean
}

export function PricingCard({
  tier,
  price,
  current,
  features,
  cta,
  ctaHref,
  ctaAction,
  highlighted,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      if (!res.ok) {
        router.push('/login')
        return
      }
      const data = (await res.json()) as { url?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`rounded-xl border p-8 transition-colors ${
        highlighted
          ? 'border-[#3ecf8e]/30 bg-[#1c1c1c]'
          : 'border-[#2e2e2e] bg-[#1c1c1c]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-[#fafafa]">{tier}</h2>
        {current && (
          <span className="rounded-[9999px] border border-[#2e2e2e] bg-[#242424] px-3 py-1 text-[12px] text-[#898989]">
            Current plan
          </span>
        )}
        {highlighted && !current && (
          <span className="rounded-[9999px] border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-3 py-1 text-[12px] text-[#3ecf8e]">
            Most popular
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mt-6 flex items-end gap-1">
        <span className="text-[40px] font-bold leading-none text-[#fafafa]">${price}</span>
        <span className="mb-1.5 text-[14px] text-[#4d4d4d]">/month</span>
      </div>

      {/* Divider */}
      <div className={`mt-6 h-px ${highlighted ? 'bg-[#3ecf8e]/20' : 'bg-[#242424]'}`} />

      {/* Features */}
      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={highlighted ? '#3ecf8e' : '#4d4d4d'}
              strokeWidth="2.5"
              className="mt-0.5 shrink-0"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[14px] text-[#b4b4b4]">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-8">
        {ctaAction === 'checkout' ? (
          <button
            onClick={() => void handleCheckout()}
            disabled={current || loading}
            className={`w-full rounded-[9999px] px-5 py-2.5 text-[14px] font-medium transition-opacity disabled:opacity-40 ${
              highlighted
                ? 'bg-[#3ecf8e] text-[#0f0f0f] hover:opacity-90'
                : 'border border-[#2e2e2e] bg-[#242424] text-[#898989] hover:text-[#fafafa]'
            }`}
          >
            {current ? 'Current plan' : loading ? 'Redirecting…' : cta}
          </button>
        ) : (
          <Link
            href={ctaHref ?? '/login'}
            className={`block w-full rounded-[9999px] px-5 py-2.5 text-center text-[14px] font-medium transition-opacity ${
              highlighted
                ? 'bg-[#3ecf8e] text-[#0f0f0f] hover:opacity-90'
                : 'border border-[#2e2e2e] bg-[#242424] text-[#898989] hover:text-[#fafafa]'
            }`}
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  )
}
