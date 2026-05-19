'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useShallow } from 'zustand/react/shallow'

import type { PartCategory, PartTier } from '@decar/shared'
import { WHEELS } from '@/components/viewer/parts/wheels/index'
import { FRONT_BUMPERS, REAR_BUMPERS, SPOILERS, SIDE_SKIRTS, HOODS } from '@/components/viewer/parts/aero/index'
import { EXHAUSTS } from '@/components/viewer/parts/exhaust/index'
import { HEADLIGHTS, TAILLIGHTS } from '@/components/viewer/parts/lights/index'
import { BRAKE_CALIPERS } from '@/components/viewer/parts/brakes/index'
import { useBuilderStore } from '@/store/builder-store'
import { PartCard } from './PartCard'

interface Tab {
  label: string
  category: PartCategory
}

const TABS: Tab[] = [
  { label: 'Wheels', category: 'wheel' },
  { label: 'Front', category: 'front_bumper' },
  { label: 'Rear', category: 'rear_bumper' },
  { label: 'Spoiler', category: 'spoiler' },
  { label: 'Skirts', category: 'side_skirts' },
  { label: 'Hood', category: 'hood' },
  { label: 'Exhaust', category: 'exhaust' },
  { label: 'Lights', category: 'headlight' },
  { label: 'Brakes', category: 'brake_caliper' },
]

function catalogFor(category: PartCategory) {
  switch (category) {
    case 'wheel': return WHEELS
    case 'front_bumper': return FRONT_BUMPERS
    case 'rear_bumper': return REAR_BUMPERS
    case 'spoiler': return SPOILERS
    case 'side_skirts': return SIDE_SKIRTS
    case 'hood': return HOODS
    case 'exhaust': return EXHAUSTS
    case 'headlight': return HEADLIGHTS
    case 'taillight': return TAILLIGHTS
    case 'brake_caliper': return BRAKE_CALIPERS
    default: return []
  }
}

const PRO_TIERS: PartTier[] = ['premium', 'legendary']

function isLocked(tier: PartTier, userTier: string | undefined): boolean {
  if (!PRO_TIERS.includes(tier)) return false
  return userTier !== 'PRO' && userTier !== 'ADMIN'
}

export function PartsPanel() {
  const [activeTab, setActiveTab] = useState<PartCategory>('wheel')
  const { data: session } = useSession()
  const userTier = (session?.user as { tier?: string } | undefined)?.tier
  const { config, setPart } = useBuilderStore(useShallow((s) => ({ config: s.config, setPart: s.setPart })))
  const parts = catalogFor(activeTab)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex shrink-0 gap-1 overflow-x-auto border-b border-[#1e1e1e] px-3 pb-0 pt-3'>
        {TABS.map((tab) => (
          <button
            key={tab.category}
            onClick={() => setActiveTab(tab.category)}
            className={[
              'shrink-0 rounded-t-md border border-b-0 px-3 py-1.5 text-[10px] font-semibold tracking-wider transition-colors',
              activeTab === tab.category
                ? 'border-[#2e2e2e] bg-[#111] text-[#e0e0e0]'
                : 'border-transparent text-[#444] hover:text-[#888]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className='flex-1 space-y-2 overflow-y-auto p-3'>
        {parts.map((part) => {
          const locked = isLocked(part.tier, userTier)
          return (
            <PartCard
              key={part.id}
              part={part}
              selected={config.parts[activeTab] === part.id}
              locked={locked}
              onSelect={() => setPart(activeTab, part.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
