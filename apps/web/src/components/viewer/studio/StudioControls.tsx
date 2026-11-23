'use client'

import type { PaintPreset } from '@/lib/model-registry'

import { VIEWS, type ViewName } from './views'

interface Props {
  view: ViewName
  onView: (view: ViewName) => void
  presets: PaintPreset[]
  paint: string | null
  onPaint: (hex: string | null) => void
  hasLights: boolean
  isLightsOn: boolean
  onLights: () => void
}

const CHIP = 'rounded-full border px-3 py-1 text-[11px] backdrop-blur-sm transition-colors'
const chipState = (isActive: boolean) =>
  isActive ? 'border-[#3ecf8e]/60 bg-[#3ecf8e]/15 text-[#3ecf8e]' : 'border-[#2e2e2e] bg-[#0f0f0f]/70 text-[#898989] hover:text-[#fafafa]'

export function StudioControls({ view, onView, presets, paint, onPaint, hasLights, isLightsOn, onLights }: Props) {
  return (
    <>
      <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button key={v.name} onClick={() => onView(v.name)} className={`${CHIP} ${chipState(view === v.name)}`}>
            {v.label}
          </button>
        ))}
      </div>

      {presets.length > 0 && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-[#2e2e2e] bg-[#0f0f0f]/70 px-3 py-2 backdrop-blur-sm">
          <button
            onClick={() => onPaint(null)}
            className={`h-5 rounded-full px-2 text-[10px] ${paint === null ? 'bg-[#fafafa] text-[#0f0f0f]' : 'text-[#898989] hover:text-[#fafafa]'}`}
          >
            Original
          </button>
          {presets.map((p) => (
            <button
              key={p.hex}
              title={p.name}
              aria-label={`Paint: ${p.name}`}
              onClick={() => onPaint(p.hex)}
              className={`h-5 w-5 rounded-full border ${paint === p.hex ? 'border-[#3ecf8e] ring-2 ring-[#3ecf8e]/40' : 'border-[#4d4d4d]'}`}
              style={{ background: p.hex }}
            />
          ))}
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex items-center gap-3">
        <span className="hidden text-[11px] text-[#4d4d4d] md:inline">Drag to rotate · Scroll to zoom</span>
        {hasLights && (
          <button onClick={onLights} className={`${CHIP} ${chipState(isLightsOn)}`}>
            Lights {isLightsOn ? 'on' : 'off'}
          </button>
        )}
      </div>
    </>
  )
}