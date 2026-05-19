'use client'

import { useMemo } from 'react'

import { useBuilderStore } from '@/store/builder-store'
import { WHEELS } from '@/components/viewer/parts/wheels/index'
import { FRONT_BUMPERS, REAR_BUMPERS, SPOILERS, SIDE_SKIRTS, HOODS } from '@/components/viewer/parts/aero/index'
import { EXHAUSTS } from '@/components/viewer/parts/exhaust/index'
import { BRAKE_CALIPERS } from '@/components/viewer/parts/brakes/index'

const ALL_PARTS = [...WHEELS, ...FRONT_BUMPERS, ...REAR_BUMPERS, ...SPOILERS, ...SIDE_SKIRTS, ...HOODS, ...EXHAUSTS, ...BRAKE_CALIPERS]

export function PerformanceBar() {
  const parts = useBuilderStore((s) => s.config.parts)

  const stats = useMemo(() => {
    let totalWeight = 0
    let totalDownforce = 0
    let totalDrag = 0
    let gripMult = 1.0

    Object.values(parts).forEach((id) => {
      if (!id) return
      const part = ALL_PARTS.find((p) => p.id === id)
      if (!part) return
      totalWeight += part.weight ?? 0
      totalDownforce += part.downforce ?? 0
      totalDrag += part.dragCoefficient ?? 0
      gripMult *= part.gripMultiplier ?? 1
    })

    return { totalWeight, totalDownforce, totalDrag: Math.round(totalDrag * 1000) / 1000, grip: Math.round(gripMult * 100) }
  }, [parts])

  return (
    <div className='flex shrink-0 items-center gap-4 border-t border-[#1e1e1e] bg-[#0c0c0c] px-4 py-2'>
      <StatPill label='Weight' value={`${stats.totalWeight}kg`} />
      <StatPill label='Downforce' value={`${stats.totalDownforce}N`} accent />
      <StatPill label='Drag Δ' value={stats.totalDrag > 0 ? `+${stats.totalDrag}` : `${stats.totalDrag}`} />
      <StatPill label='Grip' value={`${stats.grip}%`} accent />
    </div>
  )
}

function StatPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className='flex items-baseline gap-1.5'>
      <span className='text-[9px] font-semibold uppercase tracking-widest text-[#444]'>{label}</span>
      <span className={['text-[13px] font-mono font-semibold tabular-nums', accent ? 'text-[#ff8c00]' : 'text-[#aaa]'].join(' ')}>
        {value}
      </span>
    </div>
  )
}