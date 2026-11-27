'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'

import { useBuilderStore } from '@/store/builder-store'

const DriveViewer = dynamic(
  () => import('@/components/viewer/DriveViewer2').then((m) => m.DriveViewer2),
  { ssr: false, loading: () => <div className='flex h-full items-center justify-center text-[13px] text-[#333]'>Loading drive…</div> },
)

export default function DrivePage() {
  const router = useRouter()
  const config = useBuilderStore((s) => s.config)

  const [speed, setSpeed] = useState(0)
  const [isRevving, setIsRevving] = useState(false)
  const [isDrifting, setIsDrifting] = useState(false)

  const handleSpeed = useCallback((s: number) => setSpeed(s), [])
  const handleRev = useCallback((r: boolean) => setIsRevving(r), [])
  const handleDrift = useCallback((d: boolean) => setIsDrifting(d), [])
  const category = config.baseBodyCategory
  const color = config.paint.bodyColor
  const source = useMemo(() => ({ kind: 'body' as const, category, color }), [category, color])

  return (
    <main className='relative h-screen w-screen overflow-hidden bg-[#080808]'>
      <DriveViewer
        className='h-full w-full'
        source={source}
        onSpeedChange={handleSpeed}
        onRevChange={handleRev}
        onDriftChange={handleDrift}
      />

      {/* HUD overlay */}
      <div className='pointer-events-none absolute inset-0 flex flex-col justify-between p-6'>
        {/* Top bar */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => router.push('/builder')}
              className='pointer-events-auto rounded-md border border-[#2e2e2e] bg-[#0a0a0a]/80 px-3 py-1.5 text-[11px] text-[#888] backdrop-blur-sm transition hover:text-[#e0e0e0]'
            >
              ← Back to Builder
            </button>
            <span className='text-[10px] font-semibold tracking-widest text-[#333]'>{config.name.toUpperCase()}</span>
          </div>
          <div className='flex items-center gap-4'>
            {isRevving && (
              <span className='animate-pulse text-[10px] font-bold tracking-widest text-[#ff4400]'>REV</span>
            )}
            {isDrifting && (
              <span className='animate-pulse text-[10px] font-bold tracking-widest text-[#ffaa00]'>DRIFT</span>
            )}
          </div>
        </div>

        {/* Speed readout bottom-right */}
        <div className='flex items-end justify-end'>
          <div className='rounded-xl border border-[#1e1e1e] bg-[#0a0a0a]/70 px-5 py-3 backdrop-blur-sm'>
            <p className='text-right text-[10px] font-semibold tracking-widest text-[#444]'>KM/H</p>
            <p className='text-right font-mono text-[38px] font-bold leading-none tabular-nums text-[#fafafa]'>
              {speed.toString().padStart(3, '0')}
            </p>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className='pointer-events-none absolute bottom-6 left-6 text-[9px] text-[#2a2a2a]'>
        WASD / ARROWS · SHIFT = NITRO · CLICK TO FOCUS
      </div>
    </main>
  )
}