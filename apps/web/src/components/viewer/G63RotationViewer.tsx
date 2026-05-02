'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

// ─── G63 side-profile SVG ──────────────────────────────────────────────────
// Proportions based on actual G63 AMG dimensions (4623mm × 1966mm, wheelbase 2890mm)
// ViewBox: 0 0 900 430  |  Ground: y=392  |  Scale: ~0.19px/mm

function G63Svg() {
  return (
    <svg
      viewBox="0 0 900 430"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mercedes-AMG G63 side profile"
    >
      {/* ── Ambient ground glow ── */}
      <ellipse cx="448" cy="400" rx="360" ry="10" fill="rgba(62,207,142,0.14)" />
      <ellipse cx="448" cy="395" rx="260" ry="5"  fill="rgba(62,207,142,0.08)" />

      {/* ── Shadow beneath car ── */}
      <ellipse cx="448" cy="390" rx="340" ry="7"  fill="rgba(0,0,0,0.5)" />

      {/* ────────────────────────────────────────────────────────────────
          BODY SILHOUETTE
          Front wheel: cx=232, cy=327  r=65
          Rear  wheel: cx=678, cy=327  r=65
          Arch radius used in path: 68

          Path goes clockwise:
          front-bottom-left → up front face → hood → windshield →
          roof → D-pillar → rear face → rear bottom → rear arch →
          floor between → front arch → front overhang → close
      ──────────────────────────────────────────────────────────────── */}
      <path
        d={[
          'M 100 327',          // front bottom-left (before arch)

          // ── Front face (nearly vertical, G-wagon signature) ──
          'L 100 285',          // bumper base
          'L 102 271',          // bumper top / grille bottom
          'L 108 261',          // front upper corner (slight angle)

          // ── Hood (very short on G-wagon, mostly flat) ──
          'L 130 254',          // leading edge of hood
          'L 232 251',          // hood at front-axle position (nearly horizontal)

          // ── Windshield (steep, nearly vertical) ──
          'L 249 238',          // windshield base (kick-point)
          'L 264  72',          // A-pillar top — windshield is ~73° angle

          // ── Roof (perfectly flat — G-wagon trademark) ──
          'L 742  72',          // roof, all the way across

          // ── D-pillar and rear glass (nearly vertical) ──
          'L 756  80',          // D-pillar top
          'L 792  80',          // rear roof edge
          'L 796 120',          // rear glass top-corner
          'L 800 295',          // rear face — near-vertical rear wall

          // ── Rear bottom ──
          'L 800 327',          // rear bumper bottom-right

          // ── Rear wheel arch ──
          'L 746 327',          // right edge of rear arch
          'A 68 68 0 0 0 610 327',  // arch sweeps down around rear wheel

          // ── Floor between arches ──
          'L 300 327',          // floor between the two wheel arches

          // ── Front wheel arch ──
          'A 68 68 0 0 0 164 327',  // arch sweeps down around front wheel

          'Z',                  // close back to M 100 327
        ].join(' ')}
        fill="#141414"
        stroke="rgba(62,207,142,0.35)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* ── Panel lines — door seams ── */}
      {/* B-pillar */}
      <line x1="400" y1="215" x2="400" y2="327" stroke="#242424" strokeWidth="1.5" />
      {/* C-pillar */}
      <line x1="600" y1="215" x2="600" y2="327" stroke="#242424" strokeWidth="1.5" />
      {/* Beltline (bottom of windows) */}
      <line x1="264" y1="215" x2="796" y2="215" stroke="#2e2e2e" strokeWidth="1" />

      {/* ── Running board ── */}
      <rect
        x="175" y="296" width="588" height="13"
        rx="4" fill="#1a1a1a" stroke="#2e2e2e" strokeWidth="1"
      />

      {/* ── Windows ──────────────────────────────────────────────── */}
      {/* Windshield area — dark glass with subtle green tint */}
      <path
        d="M 249 238 L 264 72 L 400 72 L 400 215 L 264 215 Z"
        fill="#091510"
        stroke="rgba(62,207,142,0.25)"
        strokeWidth="1"
      />

      {/* Front side window */}
      <rect
        x="264" y="75" width="132" height="137"
        rx="2" fill="#091510" stroke="rgba(62,207,142,0.2)" strokeWidth="1"
      />

      {/* Middle (largest) side window */}
      <rect
        x="403" y="75" width="193" height="137"
        rx="2" fill="#091510" stroke="rgba(62,207,142,0.2)" strokeWidth="1"
      />

      {/* Rear quarter window */}
      <rect
        x="603" y="75" width="149" height="137"
        rx="2" fill="#091510" stroke="rgba(62,207,142,0.2)" strokeWidth="1"
      />

      {/* Rear glass (nearly vertical) */}
      <rect
        x="756" y="83" width="36" height="130"
        rx="2" fill="#091510" stroke="rgba(62,207,142,0.15)" strokeWidth="1"
      />

      {/* ── Front headlight (G63 — rectangular housing, round light) ── */}
      {/* Housing */}
      <rect
        x="100" y="250" width="34" height="32"
        rx="3" fill="#0a0a0a" stroke="rgba(62,207,142,0.6)" strokeWidth="1.5"
      />
      {/* DRL strip */}
      <rect
        x="100" y="250" width="34" height="5"
        rx="1" fill="rgba(62,207,142,0.9)"
      />
      {/* Main beam circle */}
      <circle cx="117" cy="268" r="11" fill="#0d1f15" stroke="rgba(62,207,142,0.7)" strokeWidth="1.5" />
      <circle cx="117" cy="268" r="6"  fill="rgba(62,207,142,0.4)" />

      {/* ── Front grille (horizontal slats — G-wagon signature) ── */}
      <rect
        x="100" y="285" width="34" height="40"
        rx="2" fill="#0a0a0a" stroke="#2e2e2e" strokeWidth="1"
      />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="100" y1={291 + i * 9}
          x2="134" y2={291 + i * 9}
          stroke="#2e2e2e" strokeWidth="1"
        />
      ))}
      {/* AMG badge-ish notch */}
      <rect x="108" y="298" width="18" height="5" rx="1" fill="#3ecf8e" opacity="0.5" />

      {/* ── Front bumper lower accent ── */}
      <rect
        x="100" y="325" width="64" height="6"
        rx="2" fill="#1a1a1a" stroke="#2e2e2e" strokeWidth="1"
      />

      {/* ── Rear tail lights (vertical — G-wagon) ── */}
      <rect
        x="796" y="140" width="4" height="80"
        rx="2" fill="rgba(220,50,30,0.85)"
      />
      <rect
        x="796" y="224" width="4" height="35"
        rx="2" fill="rgba(255,120,0,0.7)"
      />
      {/* Thin accent line */}
      <line
        x1="795" y1="138" x2="795" y2="280"
        stroke="rgba(220,50,30,0.4)" strokeWidth="1"
      />

      {/* ── Spare wheel on tailgate (G-wagon trademark) ── */}
      {/* Housing bracket */}
      <rect x="798" y="148" width="8" height="120" rx="2" fill="#1a1a1a" stroke="#2e2e2e" strokeWidth="1" />
      {/* Wheel */}
      <circle cx="840" cy="208" r="56" fill="#111" stroke="#2e2e2e" strokeWidth="2" />
      <circle cx="840" cy="208" r="44" fill="#0d0d0d" stroke="#333" strokeWidth="1.5" />
      {/* Tire tread */}
      <circle cx="840" cy="208" r="56" fill="none" stroke="#1a1a1a" strokeWidth="10" strokeDasharray="8 4" />
      {/* Rim spokes × 5 */}
      {[0, 1, 2, 3, 4].map((i) => {
        const ang = ((i * 72 - 18) * Math.PI) / 180
        return (
          <line
            key={i}
            x1={840} y1={208}
            x2={840 + 40 * Math.cos(ang)}
            y2={208 + 40 * Math.sin(ang)}
            stroke="#3a3a3a" strokeWidth="4" strokeLinecap="round"
          />
        )
      })}
      {/* Centre cap */}
      <circle cx="840" cy="208" r="10" fill="#1a1a1a" stroke="#3ecf8e" strokeWidth="1.5" />
      <circle cx="840" cy="208" r="4"  fill="#3ecf8e" opacity="0.7" />

      {/* ── Front wheel ──────────────────────────────────────── */}
      {/* Arch fill (hides body bottom inside arch) */}
      <circle cx="232" cy="327" r="65" fill="#0a0a0a" />
      {/* Tyre */}
      <circle cx="232" cy="327" r="65" fill="#0c0c0c" stroke="#1a1a1a" strokeWidth="10" />
      {/* Tread dash */}
      <circle cx="232" cy="327" r="65" fill="none" stroke="#181818" strokeWidth="6" strokeDasharray="10 5" />
      {/* Rim */}
      <circle cx="232" cy="327" r="44" fill="#1a1a1a" stroke="#2e2e2e" strokeWidth="1.5" />
      {/* Spokes × 5 */}
      {[0, 1, 2, 3, 4].map((i) => {
        const ang = (i * 72 * Math.PI) / 180
        return (
          <line
            key={i}
            x1={232} y1={327}
            x2={232 + 40 * Math.cos(ang)}
            y2={327 + 40 * Math.sin(ang)}
            stroke="#3a3a3a" strokeWidth="4.5" strokeLinecap="round"
          />
        )
      })}
      {/* Brake caliper (red — G63 AMG) */}
      <circle cx="232" cy="327" r="20" fill="none" stroke="rgba(200,30,30,0.6)" strokeWidth="8" strokeDasharray="18 50" />
      {/* Hub */}
      <circle cx="232" cy="327" r="10" fill="#111" stroke="#3ecf8e" strokeWidth="1.5" />
      <circle cx="232" cy="327" r="4"  fill="#3ecf8e" />

      {/* ── Rear wheel ───────────────────────────────────────── */}
      <circle cx="678" cy="327" r="65" fill="#0a0a0a" />
      <circle cx="678" cy="327" r="65" fill="#0c0c0c" stroke="#1a1a1a" strokeWidth="10" />
      <circle cx="678" cy="327" r="65" fill="none" stroke="#181818" strokeWidth="6" strokeDasharray="10 5" />
      <circle cx="678" cy="327" r="44" fill="#1a1a1a" stroke="#2e2e2e" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map((i) => {
        const ang = (i * 72 * Math.PI) / 180
        return (
          <line
            key={i}
            x1={678} y1={327}
            x2={678 + 40 * Math.cos(ang)}
            y2={327 + 40 * Math.sin(ang)}
            stroke="#3a3a3a" strokeWidth="4.5" strokeLinecap="round"
          />
        )
      })}
      <circle cx="678" cy="327" r="20" fill="none" stroke="rgba(200,30,30,0.6)" strokeWidth="8" strokeDasharray="18 50" />
      <circle cx="678" cy="327" r="10" fill="#111" stroke="#3ecf8e" strokeWidth="1.5" />
      <circle cx="678" cy="327" r="4"  fill="#3ecf8e" />

      {/* ── Subtle reflection below ground line ── */}
      <path
        d="M 100 393 L 800 393"
        stroke="rgba(62,207,142,0.08)" strokeWidth="1"
      />
    </svg>
  )
}

// ─── 360° Turntable ───────────────────────────────────────────────────────
export function G63RotationViewer() {
  const [angle, setAngle]       = useState(20)      // start slightly turned
  const [isDragging, setIsDragging] = useState(false)

  const animFrameRef    = useRef<number | null>(null)
  const lastTimeRef     = useRef<number>(0)
  const dragStartXRef   = useRef(0)
  const dragStartAngle  = useRef(0)

  // ── Auto-rotate when idle ────────────────────────────────────────────
  useEffect(() => {
    if (isDragging) {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
      return
    }

    const tick = (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now
      setAngle((a) => (a + delta * 0.025) % 360)   // ~9° per second
      animFrameRef.current = requestAnimationFrame(tick)
    }
    lastTimeRef.current = 0
    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isDragging])

  // ── Mouse drag ───────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartXRef.current  = e.clientX
    dragStartAngle.current = angle
  }, [angle])

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => {
      const delta = (e.clientX - dragStartXRef.current) * 0.45
      setAngle(((dragStartAngle.current + delta) % 360 + 360) % 360)
    }
    const onUp = () => {
      setIsDragging(false)
      lastTimeRef.current = 0
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  // ── Touch drag ───────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    setIsDragging(true)
    dragStartXRef.current  = touch.clientX
    dragStartAngle.current = angle
  }, [angle])

  useEffect(() => {
    if (!isDragging) return

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      const delta = (touch.clientX - dragStartXRef.current) * 0.45
      setAngle(((dragStartAngle.current + delta) % 360 + 360) % 360)
    }
    const onTouchEnd = () => {
      setIsDragging(false)
      lastTimeRef.current = 0
    }

    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDragging])

  // ── Rotation transform ───────────────────────────────────────────────
  // scaleX = |cos(angle)| → squish to 0 at 90°/270°, full at 0°/180°
  // flip   = mirror SVG when showing "back" half of rotation
  const rad    = (angle * Math.PI) / 180
  const cosA   = Math.cos(rad)
  const scaleX = Math.abs(cosA)
  const flip   = cosA < 0

  return (
    <div className="relative w-full select-none">
      {/* Drag hint */}
      <div
        className="absolute right-0 top-0 z-10 flex items-center gap-1.5 rounded-[9999px] border border-[#2e2e2e] bg-[#0f0f0f] px-3 py-1.5 text-[12px] text-[#898989]"
        aria-hidden
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 8l-4 4 4 4M17 8l4 4-4 4" />
        </svg>
        Drag to rotate
      </div>

      {/* Platform glow ring */}
      <div className="absolute bottom-4 left-1/2 h-4 w-4/5 -translate-x-1/2 rounded-full bg-[#3ecf8e]/10 blur-2xl" />

      {/* Car with rotation transform */}
      <div
        role="img"
        aria-label="Mercedes-AMG G63 rotating 360 degrees"
        className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          transform: `scaleX(${flip ? -scaleX : scaleX})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <G63Svg />
      </div>

      {/* Angle readout */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <span className="font-mono text-[11px] text-[#3ecf8e]/50">
          {Math.round(angle).toString().padStart(3, '0')}°
        </span>
      </div>
    </div>
  )
}
