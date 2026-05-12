'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Spotlight } from '@/components/ui/spotlight'

const G63AssemblyViewer = dynamic(
  () => import('@/components/viewer/G63AssemblyViewer').then((m) => m.G63AssemblyViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8B9178]/30 border-t-[#8B9178]" />
      </div>
    ),
  },
)

const STATS = [
  { label: 'Engine',   value: '4.0L V8 Biturbo' },
  { label: 'Power',    value: '577 hp' },
  { label: 'Torque',   value: '850 Nm' },
  { label: '0–100',    value: '4.5 s' },
]

export function G63HeroCard() {
  return (
    <Card className="relative w-full overflow-hidden border-[#2a2a2a] bg-black/95 md:h-[520px]">
      {/* Mouse-following warm spotlight */}
      <Spotlight size={420} />

      {/* Subtle top-left static glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#D4B483]/[0.05] blur-[80px]"
      />

      <div className="flex h-full flex-col md:flex-row">

        {/* ── Left — text content ───────────────────────────────────── */}
        <div className="relative z-10 flex flex-col justify-center gap-6 p-8 md:w-[42%] md:p-12">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8B9178]" />
            <span className="font-mono text-[10px] tracking-[2px] text-[#6B8C7A]">MERCEDES-AMG · G-CLASS</span>
          </div>

          {/* Headline */}
          <div>
            <h2 className="text-[clamp(36px,5vw,58px)] font-bold leading-[0.92] tracking-[-1px] text-[#E8E4D8]">
              G63
            </h2>
            <h2 className="text-[clamp(36px,5vw,58px)] font-bold leading-[0.92] tracking-[-1px] text-[#8B9178]">
              AMG
            </h2>
          </div>

          {/* Description */}
          <p className="max-w-xs text-[14px] leading-[1.6] text-[#6B6B5B]">
            577 horses in a body built for any terrain.
            25 named parts assembled in real-time — drag to orbit.
          </p>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="border-l-2 border-[#5A5A48] pl-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#4A4A38]">{s.label}</p>
                <p className="mt-0.5 font-mono text-[13px] text-[#BFB89A]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/vehicles"
              className="border border-[#6B8C7A]/40 bg-transparent px-5 py-2 font-mono text-[11px] tracking-widest text-[#6B8C7A] transition-colors hover:border-[#8B9178]/70 hover:text-[#8B9178]"
            >
              EXPLORE DATABASE
            </Link>
          </div>

          {/* Corner bracket — bottom left */}
          <div className="pointer-events-none absolute bottom-5 left-5 h-5 w-5 border-b border-l border-[#5A5A48]/60" />
        </div>

        {/* ── Right — Three.js G63 assembly viewer ─────────────────── */}
        <div className="relative flex-1 md:h-full min-h-[300px]">
          <G63AssemblyViewer className="h-full w-full rounded-none border-0" />
        </div>
      </div>

      {/* Corner brackets */}
      <div className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l border-t border-[#6B8C7A]/30" />
      <div className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r border-t border-[#6B8C7A]/30" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b border-r border-[#6B8C7A]/30" />
    </Card>
  )
}