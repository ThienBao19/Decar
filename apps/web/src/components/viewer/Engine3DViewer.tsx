'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  vehicleId: string
  modelUrl?: string
}

// Animated engine cross-section SVG — placeholder until real GLB models are loaded
function EngineWireframe({ animated }: { animated: boolean }) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={`h-full w-full ${animated ? 'opacity-100' : 'opacity-60'}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Engine block */}
      <rect x="80" y="80" width="240" height="140" rx="8" stroke="#3ecf8e" strokeWidth="1.5" strokeDasharray={animated ? '0' : '4 4'} />
      {/* Cylinders */}
      {[110, 150, 190, 230, 270].map((x) => (
        <g key={x}>
          <rect x={x - 12} y="50" width="24" height="45" rx="4" stroke="#3ecf8e" strokeWidth="1" opacity="0.7" />
          <line x1={x} y1="50" x2={x} y2="80" stroke="#3ecf8e" strokeWidth="1" opacity="0.5" />
        </g>
      ))}
      {/* Crankshaft */}
      <ellipse cx="200" cy="185" rx="70" ry="20" stroke="#3ecf8e" strokeWidth="1.5" opacity="0.6" />
      <line x1="130" y1="185" x2="270" y2="185" stroke="#3ecf8e" strokeWidth="1" strokeDasharray="6 3" opacity="0.4" />
      {/* Exhaust manifold */}
      <path d="M320 100 Q360 120 360 160 Q360 200 320 200" stroke="#3ecf8e" strokeWidth="1.5" opacity="0.6" />
      {/* Intake */}
      <path d="M80 100 Q40 120 40 160 Q40 200 80 200" stroke="#3ecf8e" strokeWidth="1.5" opacity="0.6" />
      {/* Cam belt */}
      <path d="M80 60 Q200 30 320 60" stroke="#3ecf8e" strokeWidth="1" strokeDasharray="8 4" opacity="0.4" />
      {/* Labels */}
      <text x="200" y="265" textAnchor="middle" fill="#4d4d4d" fontSize="11" fontFamily="monospace">
        {animated ? 'INTERACTIVE 3D — PRO' : 'ENGINE WIREFRAME'}
      </text>
    </svg>
  )
}

export function Engine3DViewer({ vehicleId, modelUrl }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startAngleRef = useRef(0)
  const rafRef = useRef<number>(0)

  // Auto-rotate when not dragging
  useEffect(() => {
    if (isDragging) return
    const step = () => {
      setAngle((prev) => (prev + 0.4) % 360)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isDragging])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    startXRef.current = e.clientX
    startAngleRef.current = angle
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const delta = e.clientX - startXRef.current
    setAngle((startAngleRef.current + delta * 0.5) % 360)
  }

  const handleMouseUp = () => setIsDragging(false)

  const rad = (angle * Math.PI) / 180
  const cosA = Math.cos(rad)
  const scaleX = Math.abs(cosA)
  const flipX = cosA < 0

  return (
    <div
      ref={canvasRef}
      className="relative flex aspect-video w-full cursor-grab select-none items-center justify-center overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#0f0f0f] active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Scan line overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(62,207,142,0.02)_2px,rgba(62,207,142,0.02)_4px)]" />

      {/* Rotating engine wireframe */}
      <div
        className="h-4/5 w-4/5"
        style={{ transform: `scaleX(${flipX ? -scaleX : scaleX})`, transition: isDragging ? 'none' : undefined }}
      >
        <EngineWireframe animated={true} />
      </div>

      {/* Drag hint */}
      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
        <span className="rounded-full border border-[#2e2e2e] bg-[#0f0f0f]/80 px-3 py-1 text-[11px] text-[#4d4d4d]">
          drag to rotate
        </span>
      </div>

      {/* Pro badge */}
      <div className="pointer-events-none absolute right-3 top-3">
        <span className="rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 text-[10px] font-medium text-[#3ecf8e]">
          PRO
        </span>
      </div>
    </div>
  )
}
