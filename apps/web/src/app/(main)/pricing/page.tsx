import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PricingCard } from '@/components/pricing/PricingCard'

export const metadata: Metadata = { title: 'Pricing' }

export default async function PricingPage() {
  const session = await getServerSession(authOptions)
  const currentTier = session?.user?.tier ?? 'FREE'

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-gray-500">
          Start for free. Upgrade when you need more.
        </p>
      </div>

      <div className="mt-16 grid gap-8 sm:grid-cols-2">
        <PricingCard
          tier="FREE"
          price={0}
          current={currentTier === 'FREE'}
          features={[
            'Basic engine & dimension specs',
            'Paint color swatches',
            '1 saved comparison',
            'Low-resolution images',
          ]}
          cta="Get started free"
          ctaHref="/login"
        />
        <PricingCard
          tier="PRO"
          price={9}
          current={currentTier === 'PRO'}
          features={[
            'Full technical spec sheets',
            'Unlimited comparisons',
            'Interactive 3D engine viewer',
            '360° exterior view',
            'Year-by-year spec history',
            'PDF export',
            'API access',
          ]}
          cta="Upgrade to Pro"
          ctaAction="checkout"
          highlighted
        />
      </div>
    </div>
  )
}
