'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

  async function handleCheckout() {
    const res = await fetch('/api/checkout', { method: 'POST' })
    if (!res.ok) {
      router.push('/login')
      return
    }
    const { url } = (await res.json()) as { url: string }
    window.location.href = url
  }

  return (
    <div
      className={`rounded-2xl p-8 ${
        highlighted
          ? 'bg-brand-700 text-white shadow-xl ring-2 ring-brand-500'
          : 'bg-white text-gray-900 shadow ring-1 ring-gray-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-bold ${highlighted ? 'text-white' : 'text-gray-900'}`}>
          {tier}
        </h2>
        {current && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              highlighted ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'
            }`}
          >
            Current plan
          </span>
        )}
      </div>

      <div className="mt-4">
        <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-gray-900'}`}>
          ${price}
        </span>
        <span className={`text-sm ${highlighted ? 'text-brand-200' : 'text-gray-500'}`}>
          /month
        </span>
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <span className={highlighted ? 'text-brand-200' : 'text-brand-500'}>✓</span>
            <span className={highlighted ? 'text-brand-100' : 'text-gray-700'}>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {ctaAction === 'checkout' ? (
          <button
            onClick={handleCheckout}
            disabled={current}
            className={`w-full rounded-lg px-5 py-3 text-sm font-semibold transition ${
              highlighted
                ? 'bg-white text-brand-700 hover:bg-brand-50 disabled:opacity-50'
                : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
            }`}
          >
            {current ? 'Current plan' : cta}
          </button>
        ) : (
          <Link
            href={ctaHref ?? '/login'}
            className={`block w-full rounded-lg px-5 py-3 text-center text-sm font-semibold ${
              highlighted
                ? 'bg-white text-brand-700 hover:bg-brand-50'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  )
}
