'use client'

import { useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'

const Porsche911DrivingViewer = dynamic(
  () => import('@/components/viewer/Porsche911DrivingViewer').then((m) => m.Porsche911DrivingViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#ff8c00]/30 border-t-[#ff8c00]" />
      </div>
    ),
  }
)

// Spotlight (ibelick / serafimcloud pattern)
function Spotlight({ size = 380 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0, opacity: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, opacity: 1 })
  }
  const handleMouseLeave = () => setPos((p) => ({ ...p, opacity: 0 }))

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]"
      style={{ zIndex: 0 }}
    >
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(200,200,200,0.10) 0%, rgba(160,160,180,0.04) 40%, transparent 70%)',
          transform: `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px)`,
          opacity: pos.opacity,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// Stat badge
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-[1.2px] text-[#4d4d4d]">{label}</span>
      <span className="text-[15px] font-semibold text-[#fafafa]">{value}</span>
    </div>
  )
}

// Main hero card
export function SplineCarHero() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [speed, setSpeed] = useState(0)
  const [isRevving, setIsRevving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleSpeedChange = useCallback((s: number) => setSpeed(s), [])
  const handleRevChange = useCallback((r: boolean) => setIsRevving(r), [])

  const toggleFullscreen = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  // Track fullscreen changes
  const handleFsRef = useRef<(() => void) | null>(null)
  if (typeof window !== 'undefined' && !handleFsRef.current) {
    handleFsRef.current = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsRef.current)
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl px-6 py-4 [--card-radius:24px]">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[var(--card-radius)] border border-[#2a2a2a] bg-black/95"
        style={{ minHeight: isFullscreen ? '100vh' : 520 }}
      >
        {/* Spotlight layer */}
        <Spotlight size={480} />

        {/* Grid */}
        <div
          className="relative z-10 flex h-full flex-col md:flex-row md:items-stretch"
          style={{ minHeight: isFullscreen ? '100vh' : 520 }}
        >

          {/* LEFT: text */}
          <div
            className={`flex flex-col justify-between gap-6 p-8 md:p-12 ${isFullscreen ? 'md:w-[28%]' : 'md:w-[42%]'}`}
            style={{ transition: 'width 0.3s ease' }}
          >
            <div className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ff8c00]/20 bg-[#ff8c00]/08 px-3 py-1 font-mono text-[10px] uppercase tracking-[1.4px] text-[#ff8c00]/70">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff8c00] animate-glow-pulse" />
                Interactive Drive
              </span>

              {/* Make / model */}
              <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] uppercase tracking-[1.6px] text-[#4d4d4d]">
                  McLaren
                </p>
                <h2 className="text-[clamp(32px,4vw,52px)] font-semibold leading-[1.0] tracking-tight text-[#fafafa]">
                  P1<br />
                  <span className="text-[#ff8c00]"></span>
                </h2>
              </div>

              <p className="max-w-[240px] text-[13px] leading-[1.6] text-[#4d4d4d]">
                Click the view and use arrow keys to drive. Hold Shift for nitro.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#1e1e22] bg-[#0d0d10] px-5 py-4">
                <Stat label="Engine" value="3.8L V8 + E" />
                <Stat label="Power" value="903 hp" />
                <Stat label="Torque" value="900 Nm" />
                <Stat label="0-100" value="2.8 s" />
              </div>

              {/* Speed display */}
              {speed > 0 && (
                <div className="flex items-baseline gap-2 rounded-xl border border-[#1e1e22] bg-[#0d0d10] px-5 py-3">
                  <span
                    className="font-mono text-[28px] font-bold leading-none tabular-nums"
                    style={{ color: isRevving ? '#ff4400' : '#fafafa' }}
                  >
                    {speed}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-[#4d4d4d]">km/h</span>
                  {isRevving && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff4400]" />
                      <span className="font-mono text-[10px] uppercase tracking-[1.2px] text-[#ff4400]">NITRO</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2">
              <button
                onClick={toggleFullscreen}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff8c00] px-5 py-2.5 text-[13px] font-medium text-[#0d0d10] transition-opacity hover:opacity-85"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Drive'}
              </button>
              <a
                href="/vehicles"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#2a2a2a] bg-transparent px-5 py-2.5 text-[13px] font-medium text-[#898989] transition-colors hover:border-[#363636] hover:text-[#fafafa]"
              >
                Explore full database
              </a>
            </div>
          </div>

          {/* RIGHT: 3D driving viewer */}
          <div className="relative flex-1 overflow-hidden md:min-h-0" style={{ minHeight: isFullscreen ? '100vh' : 320 }}>
            {/* Left gradient fade */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black/60 to-transparent" />

            <Porsche911DrivingViewer
              className="h-full w-full"
              onSpeedChange={handleSpeedChange}
              onRevChange={handleRevChange}
            />

            {/* HUD corners */}
            {[
              'top-3 left-3 border-t border-l',
              'top-3 right-3 border-t border-r',
              'bottom-3 left-3 border-b border-l',
              'bottom-3 right-3 border-b border-r',
            ].map((cls) => (
              <div
                key={cls}
                className={`pointer-events-none absolute z-20 h-4 w-4 border-[#ff8c00]/30 ${cls}`}
              />
            ))}

            {/* Controls hint */}
            <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-black/70 px-3 py-1.5 backdrop-blur-sm">
              <div className="flex gap-1">
                <kbd className="rounded border border-white/15 bg-white/05 px-1.5 py-0.5 font-mono text-[8px] text-white/50">W</kbd>
                <kbd className="rounded border border-white/15 bg-white/05 px-1.5 py-0.5 font-mono text-[8px] text-white/50">A</kbd>
                <kbd className="rounded border border-white/15 bg-white/05 px-1.5 py-0.5 font-mono text-[8px] text-white/50">S</kbd>
                <kbd className="rounded border border-white/15 bg-white/05 px-1.5 py-0.5 font-mono text-[8px] text-white/50">D</kbd>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.8px] text-[#4d4d4d]">Drive</span>
              <kbd className="rounded border border-[#ff4400]/30 bg-[#ff4400]/08 px-1.5 py-0.5 font-mono text-[8px] text-[#ff4400]/60">SHIFT</kbd>
              <span className="font-mono text-[8px] uppercase tracking-[0.8px] text-[#4d4d4d]">Nitro</span>
            </div>

            {/* Rev glow overlay */}
            {isRevving && (
              <div
                className="pointer-events-none absolute inset-0 z-30"
                style={{ boxShadow: 'inset 0 0 60px rgba(255,68,0,0.1), inset 0 0 120px rgba(255,68,0,0.03)' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}