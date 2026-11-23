'use client'

import type { PartDef } from '@decar/shared'

interface Props {
  part: PartDef
  selected: boolean
  locked: boolean
  onSelect: () => void
}

const TIER_COLOR: Record<string, string> = {
  oem: 'text-[#666]',
  aftermarket: 'text-[#4a9eff]',
  premium: 'text-[#ffd700]',
  legendary: 'text-[#ff6b35]',
}

const TIER_LABEL: Record<string, string> = {
  oem: 'OEM',
  aftermarket: 'SPORT',
  premium: 'PRO',
  legendary: 'LEGEND',
}

export function PartCard({ part, selected, locked, onSelect }: Props) {
  return (
    <button
      onClick={locked ? undefined : onSelect}
      className={[
        'w-full rounded-lg border p-3 text-left transition-all',
        locked
          ? 'cursor-not-allowed border-[#1a1a1a] bg-[#0d0d0d] opacity-50'
          : selected
            ? 'border-[#ff4400] bg-[#1a0a00]'
            : 'border-[#1e1e1e] bg-[#111] hover:border-[#333]',
      ].join(' ')}
    >
      <div className='flex items-start justify-between gap-2'>
        <span className='text-[12px] font-medium leading-tight text-[#e0e0e0]'>{part.name}</span>
        <span className={['shrink-0 text-[9px] font-bold uppercase tracking-widest', TIER_COLOR[part.tier]].join(' ')}>
          {locked ? '🔒 ' : ''}{TIER_LABEL[part.tier] ?? part.tier}
        </span>
      </div>
      {part.description && (
        <p className='mt-1 text-[10px] leading-snug text-[#555]'>{part.description}</p>
      )}
      {locked && (
        <p className='mt-1.5 text-[9px] font-semibold text-[#ff8c00]'>Upgrade to PRO to unlock</p>
      )}
      {!locked && (
        <div className='mt-2 flex flex-wrap gap-2'>
          {part.weight !== undefined && <Stat label='Wt' value={`${part.weight}kg`} />}
          {part.gripMultiplier !== undefined && part.gripMultiplier !== 1 && (
            <Stat label='Grip' value={`x${part.gripMultiplier.toFixed(2)}`} accent />
          )}
          {part.downforce !== undefined && part.downforce > 0 && (
            <Stat label='DF' value={`+${part.downforce}N`} accent />
          )}
        </div>
      )}
    </button>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className={['text-[9px]', accent ? 'text-[#ff8c00]' : 'text-[#444]'].join(' ')}>
      {label} <span className={accent ? 'text-[#ffb347]' : 'text-[#666]'}>{value}</span>
    </span>
  )
}