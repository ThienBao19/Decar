import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Metadata } from 'next'

import { PRO_MONTHLY_PRICE_USD } from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'Vehicle Intelligence Platform',
}

const SplineCarHero = dynamic(
  () => import('@/components/viewer/SplineCarHero').then((m) => m.SplineCarHero),
  { ssr: false },
)


export default function HomePage() {
  return (
    <div className="flex flex-col">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[500px] w-[800px] rounded-full bg-[#3ecf8e]/[0.04] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-10">
          <div className="mb-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-[9999px] border border-[#2e2e2e] bg-[#0f0f0f] px-4 py-1.5 text-[12px] text-[#898989]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-glow-pulse" />
              Engine specs, 3D viewers &amp; full paint history
            </span>
          </div>

          <h1 className="mx-auto max-w-3xl text-center text-[clamp(40px,6vw,72px)] font-normal leading-[1.00] tracking-tight text-[#fafafa]">
            Every detail about every vehicle
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-center text-[16px] leading-[1.50] text-[#898989]">
            Engine specs, paint colors, 3D models, interior details — all in one place.
            Free for basics. Pro for the full picture.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/vehicles"
              className="rounded-[9999px] bg-[#3ecf8e] px-6 py-[10px] text-[14px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
            >
              Explore Vehicles
            </Link>
            <Link
              href="/pricing"
              className="rounded-[9999px] border border-[#2e2e2e] bg-[#0f0f0f] px-6 py-[10px] text-[14px] font-medium text-[#fafafa] transition-colors hover:border-[#363636]"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Interactive G63 card */}
        <SplineCarHero />
        <div className="h-8" />
      </section>

      {/* ── SPEC TICKER ───────────────────────────────────────────────── */}
      <div className="border-y border-[#242424] bg-[#0f0f0f] py-3 overflow-hidden">
        <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
          {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, i) => (
            <span key={i} className="mx-8 font-mono text-[12px] uppercase tracking-[1.2px] text-[#4d4d4d]">
              <span className="text-[#3ecf8e]">{item.value}</span>
              {' '}{item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-6 py-20">
        <div className="mb-16 flex flex-col items-center gap-4">
          <p className="font-mono text-[12px] uppercase tracking-[1.2px] text-[#3ecf8e]">Platform</p>
          <h2 className="max-w-xl text-center text-[clamp(28px,4vw,36px)] font-normal leading-[1.25] text-[#fafafa]">
            What you get with Decar
          </h2>
        </div>

        <div className="grid gap-px border border-[#2e2e2e] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col gap-4 bg-[#171717]/60 backdrop-blur-sm p-8 transition-colors hover:bg-[#1c1c1c]/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] text-xl">
                {f.icon}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-medium tracking-[-0.16px] text-[#fafafa]">{f.title}</h3>
                  {f.pro && (
                    <span className="rounded-[9999px] border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 text-[11px] text-[#3ecf8e]">Pro</span>
                  )}
                </div>
                <p className="text-[14px] leading-[1.57] text-[#898989]">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIER COMPARISON ───────────────────────────────────────────── */}
      <section className="border-y border-[#242424] bg-[#0f0f0f] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[1.2px] text-[#3ecf8e]">Pricing</p>
            <h2 className="mt-3 text-[clamp(28px,4vw,36px)] font-normal leading-[1.25] text-[#fafafa]">
              Start free. Go Pro when you&apos;re ready.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[16px] border border-[#2e2e2e] bg-[#171717] p-8">
              <p className="text-[14px] font-medium text-[#898989]">Free</p>
              <p className="mt-2 text-[36px] font-normal text-[#fafafa]">$0</p>
              <p className="mt-1 text-[14px] text-[#4d4d4d]">forever</p>
              <Link
                href="/register"
                className="mt-8 block rounded-[9999px] border border-[#363636] bg-[#0f0f0f] px-6 py-[10px] text-center text-[14px] font-medium text-[#fafafa] transition-colors hover:border-[#4d4d4d]"
              >
                Get started
              </Link>
              <ul className="mt-8 flex flex-col gap-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[14px] text-[#898989]">
                    <span className="text-[#3ecf8e]">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[16px] border border-[#3ecf8e]/40 bg-[#171717] p-8 shadow-[0_0_40px_rgba(62,207,142,0.06)]">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-[#fafafa]">Pro</p>
                <span className="rounded-[9999px] bg-[#3ecf8e] px-2.5 py-0.5 text-[11px] font-medium text-[#0f0f0f]">Popular</span>
              </div>
              <p className="mt-2 text-[36px] font-normal text-[#fafafa]">${PRO_MONTHLY_PRICE_USD}</p>
              <p className="mt-1 text-[14px] text-[#4d4d4d]">per month</p>
              <Link
                href="/pricing"
                className="mt-8 block rounded-[9999px] bg-[#3ecf8e] px-6 py-[10px] text-center text-[14px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
              >
                Upgrade to Pro
              </Link>
              <ul className="mt-8 flex flex-col gap-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[14px] text-[#b4b4b4]">
                    <span className="text-[#3ecf8e]">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────── */}
      <section className="border-t border-[#242424] px-6 py-24 text-center">
        <h2 className="mx-auto max-w-lg text-[clamp(28px,4vw,36px)] font-normal leading-[1.25] text-[#fafafa]">
          The spec sheet for every vehicle ever made.
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-[16px] text-[#898989]">
          Join thousands of enthusiasts, mechanics, and buyers who trust Decar.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/vehicles"
            className="rounded-[9999px] bg-[#3ecf8e] px-8 py-[10px] text-[14px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
          >
            Start exploring
          </Link>
        </div>
      </section>
    </div>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { value: '4.0L', label: 'V8 Biturbo' },
  { value: '577hp', label: 'Power output' },
  { value: '850Nm', label: 'Peak torque' },
  { value: '4.5s', label: '0-100 km/h' },
  { value: 'AMG', label: 'Performance' },
  { value: 'AWD', label: '4MATIC+' },
  { value: '22"', label: 'Forged wheels' },
  { value: 'G63', label: 'Mercedes-AMG' },
]

const FEATURES = [
  { icon: '⚙️', title: 'Engine Specs', description: 'Displacement, cylinders, fuel type, power output in kW and hp, torque, and drivetrain.', pro: false },
  { icon: '🎨', title: 'Paint Colors', description: 'Every factory color option with exact hex codes, color names, and availability by year.', pro: false },
  { icon: '⚖️', title: 'Side-by-Side Comparison', description: 'Compare up to two vehicles on specs, dimensions, and features in a clean table.', pro: false },
  { icon: '🔄', title: '3D Interactive Viewer', description: 'Rotate, zoom, and inspect the engine, exterior, and interior in full 3D.', pro: true },
  { icon: '📅', title: 'Year-by-Year History', description: 'Track how specs changed across every model year — spot facelifts and power bumps.', pro: true },
  { icon: '📄', title: 'PDF Export', description: 'Export a clean, shareable PDF spec sheet. Perfect for buyers and workshops.', pro: true },
]

const FREE_FEATURES = ['Basic engine specs', 'Paint color swatches', '1 saved comparison', 'Low-res exterior images']
const PRO_FEATURES = ['Everything in Free', 'Interactive 3D viewer', 'Full interior & engine specs', 'Year-by-year history', 'Unlimited comparisons', 'PDF spec sheet export', 'API access']