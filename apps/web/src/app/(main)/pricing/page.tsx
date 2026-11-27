import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PricingCard } from '@/components/pricing/PricingCard'
import { PRO_MONTHLY_PRICE_USD } from '@/lib/pricing'

export const metadata: Metadata = { title: 'Pricing — Decar' }

const FREE_FEATURES = [
  'Basic engine & dimension specs',
  'Paint color swatches',
  '1 saved comparison',
  'Low-resolution images',
  'Vehicle search',
  'Photoreal 3D studio (selected models)',
]

const PRO_FEATURES = [
  'Power & torque figures',
  'Interior details',
  'Unlimited comparisons',
  'Printable spec sheet (save as PDF)',
]

// Planned, not built yet: listed so nobody pays expecting them today
const COMING_SOON = ['Year-by-year spec history', 'API access']

const COMPARISON_ROWS: [string, string | boolean, string | boolean][] = [
  ['Vehicle search', true, true],
  ['Basic specs', true, true],
  ['Paint color swatches', true, true],
  ['Saved comparisons', '1', 'Unlimited'],
  ['Image quality', 'Low-res', 'Full-res'],
  ['Photoreal 3D studio (selected models)', true, true],
  ['Power & torque', false, true],
  ['Interior details', false, true],
  ['Printable spec sheet', false, true],
  ['Spec history', false, 'Coming soon'],
  ['API access', false, 'Coming soon'],
]

const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your dashboard at any time — your Pro access continues until the end of the billing period.',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Free plan is yours forever. Upgrade to Pro whenever you need advanced features.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards via Stripe. Payments are processed securely — we never store your card details.',
  },
]

export default async function PricingPage() {
  const session = await getServerSession(authOptions)
  const currentTier = session?.user?.tier ?? 'FREE'

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-[32px] font-bold tracking-tight text-[#fafafa]">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-[16px] text-[#898989]">
          Start for free. Upgrade when you need more.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        <PricingCard
          tier="FREE"
          price={0}
          current={currentTier === 'FREE'}
          features={FREE_FEATURES}
          cta="Get started free"
          ctaHref="/login"
        />
        <PricingCard
          tier="PRO"
          price={PRO_MONTHLY_PRICE_USD}
          current={currentTier === 'PRO'}
          features={PRO_FEATURES}
          cta="Upgrade to Pro"
          ctaAction="checkout"
          highlighted
        />
      </div>
      <p className="mt-6 text-center text-[13px] text-[#898989]">
        Coming to Pro: {COMING_SOON.join(' · ')}
      </p>

      {/* Feature comparison table */}
      <div className="mt-16 overflow-hidden rounded-xl border border-[#2e2e2e]">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-[#2e2e2e] bg-[#1c1c1c]">
              <th className="px-6 py-4 text-left font-medium text-[#898989]">Feature</th>
              <th className="px-6 py-4 text-center font-medium text-[#898989]">Free</th>
              <th className="px-6 py-4 text-center font-medium text-[#3ecf8e]">Pro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242424] bg-[#171717]">
            {COMPARISON_ROWS.map(([feature, free, pro]) => (
              <tr key={feature}>
                <td className="px-6 py-3 text-[#b4b4b4]">{feature}</td>
                <td className="px-6 py-3 text-center">
                  {typeof free === 'boolean' ? (
                    <CheckIcon active={free} />
                  ) : (
                    <span className="text-[#898989]">{free}</span>
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  {typeof pro === 'boolean' ? (
                    <CheckIcon active={pro} green={pro} />
                  ) : (
                    <span className={pro === 'Coming soon' ? 'text-[#898989]' : 'text-[#3ecf8e]'}>{pro}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-[20px] font-semibold text-[#fafafa]">Frequently asked questions</h2>
        <div className="mt-6 space-y-4">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-[#2e2e2e] bg-[#1c1c1c] px-6 py-5">
              <p className="font-medium text-[#fafafa]">{q}</p>
              <p className="mt-1.5 text-[14px] text-[#898989]">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CheckIcon({ active, green }: { active: boolean; green?: boolean }) {
  if (!active) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e2e2e" strokeWidth="2" className="mx-auto">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={green ? '#3ecf8e' : '#4d4d4d'} strokeWidth="2.5" className="mx-auto">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
