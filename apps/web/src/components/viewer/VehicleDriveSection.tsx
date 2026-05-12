'use client'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const Viewer = dynamic(
  () => import('./Porsche911DrivingViewer').then((m) => ({ default: m.Porsche911DrivingViewer })),
  { ssr: false, loading: () => <div className='flex h-full items-center justify-center text-[#4d4d4d] text-[13px]'>Loading…</div> },
)

interface Props { make: string; model: string; bodyColor?: number | undefined }

export function VehicleDriveSection({ make, model, bodyColor }: Props) {
  const [speed, setSpeed] = useState(0)
  const [revving, setRevving] = useState(false)
  const [drifting, setDrifting] = useState(false)
  const onSpeed = useCallback((s: number) => setSpeed(s), [])
  const onRev = useCallback((r: boolean) => setRevving(r), [])
  const onDrift = useCallback((d: boolean) => setDrifting(d), [])

  return (
    <div className='relative w-full overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#0f0f0f]' style={{ height: 420 }}>
      <Viewer className='w-full h-full' make={make} model={model} {...(bodyColor !== undefined ? { bodyColor } : {})}
        onSpeedChange={onSpeed} onRevChange={onRev} onDriftChange={onDrift} />
      <div className='pointer-events-none absolute bottom-4 left-4 flex items-end gap-3'>
        <div className='rounded-lg border border-[#2e2e2e] bg-[#0f0f0f]/80 px-3 py-2 backdrop-blur-sm'>
          <p className='text-[10px] uppercase tracking-widest text-[#4d4d4d]'>Speed</p>
          <p className='text-[22px] font-bold tabular-nums text-[#fafafa]'>{speed}</p>
          <p className='text-[9px] text-[#4d4d4d]'>km/h</p>
        </div>
        {revving && <div className='flex items-center gap-1.5 rounded-lg border border-[#ff6600]/40 bg-[#ff4400]/10 px-3 py-2 backdrop-blur-sm'><span className='inline-block h-2 w-2 animate-ping rounded-full bg-[#ff6600]' /><span className='text-[11px] font-semibold text-[#ff8800]'>NITRO</span></div>}
        {drifting && <div className='flex items-center gap-1.5 rounded-lg border border-[#3ecf8e]/40 bg-[#3ecf8e]/10 px-3 py-2 backdrop-blur-sm'><span className='inline-block h-2 w-2 animate-ping rounded-full bg-[#3ecf8e]' /><span className='text-[11px] font-semibold text-[#3ecf8e]'>DRIFT</span></div>}
      </div>
      <div className='pointer-events-none absolute bottom-4 right-4 rounded-lg border border-[#2e2e2e] bg-[#0f0f0f]/80 px-3 py-2 backdrop-blur-sm text-[10px] text-[#4d4d4d]'>
        <p>W / ↑ accelerate &nbsp;·&nbsp; A D steer &nbsp;·&nbsp; S / ↓ reverse</p>
        <p className='mt-0.5 text-[#3a3a3a]'>Hold Shift — nitro 🔥 &nbsp;·&nbsp; Space — handbrake ✨</p>
      </div>
      <div className='pointer-events-none absolute left-4 top-4 text-[11px] font-medium text-[#898989]'>{make} {model} — Click to focus</div>
    </div>
  )
}
