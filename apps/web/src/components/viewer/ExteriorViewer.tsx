'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  vehicleId: string
  imageUrls?: string[]
}

// Side-profile vehicle silhouette — placeholder until real media is loaded
function VehicleSilhouette() {
  return (
    <svg viewBox="0 0 500 220" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <path
        d="M 60 155 L 60 120 Q 80 90 130 75 L 210 58 Q 250 48 290 58 L 370 75 Q 420 88 445 120 L 445 155 A 38 38 0 0 0 407 155 L 170 155 A 38 38 0 0 0 132 155 Z"
        stroke="#3ecf8e"
        strokeWidth="1.5"
        fill="rgba(62,207,142,0.04)"
      />
      {/* Cabin */}
      <path
        d="M 155 110 Q 175 72 215 62 L 295 62 Q 340 68 360 110 Z"
        stroke="#3ecf8e"
        strokeWidth="1"
        fill="rgba(62,207,142,0.06)"
      />
      {/* Window split */}
      <line x1="250" y1="63" x2="258" y2="110" stroke="#3ecf8e" strokeWidth="0.8" opacity="0.5" />
      {/* Front wheel */}
      <circle cx="380" cy="155" r="33" stroke="#3ecf8e" strokeWidth="1.5" />
      <circle cx="380" cy="155" r="18" stroke="#3ecf8e" strokeWidth="1" opacity="0.5" />
      <circle cx="380" cy="155" r="4" fill="#3ecf8e" opacity="0.6" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1={380 + 18 * Math.cos((deg * Math.PI) / 180)}
          y1={155 + 18 * Math.sin((deg * Math.PI) / 180)}
          x2={380 + 30 * Math.cos((deg * Math.PI) / 180)}
          y2={155 + 30 * Math.sin((deg * Math.PI) / 180)}
          stroke="#3ecf8e"
          strokeWidth="1.2"
          opacity="0.6"
        />
      ))}
      {/* Rear wheel */}
      <circle cx="127" cy="155" r="33" stroke="#3ecf8e" strokeWidth="1.5" />
      <circle cx="127" cy="155" r="18" stroke="#3ecf8e" strokeWidth="1" opacity="0.5" />
      <circle cx="127" cy="155" r="4" fill="#3ecf8e" opacity="0.6" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1={127 + 18 * Math.cos((deg * Math.PI) / 180)}
          y1={155 + 18 * Math.sin((deg * Math.PI) / 180)}
          x2={127 + 30 * Math.cos((deg * Math.PI) / 180)}
          y2={155 + 30 * Math.sin((deg * Math.PI) / 180)}
          stroke="#3ecf8e"
          strokeWidth="1.2"
          opacity="0.6"
        />
      ))}
      {/* Headlight */}
      <path d="M 445 118 L 460 118 L 462 128 L 445 130 Z" stroke="#3ecf8e" strokeWidth="1" fill="rgba(62,207,142,0.15)" />
      {/* Taillight */}
      <path d="M 60 118 L 48 120 L 48 132 L 60 130 Z" stroke="#3ecf8e" strokeWidth="1" fill="rgba(62,207,142,0.1)" />
    </svg>
  )
}

export function ExteriorViewer({ vehicleId, imageUrls }: Props) {
  const [angle, setAngle] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startAngleRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (isDragging) return
    const step = () => {
      setAngle((prev) => (prev + 0.3) % 360)
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
    setAngle((startAngleRef.current + delta * 0.4) % 360)
  }

  const handleMouseUp = () => setIsDragging(false)

  const rad = (angle * Math.PI) / 180
  const cosA = Math.cos(rad)
  const scaleX = Math.abs(cosA)
  const flipX = cosA < 0

  // Show real images if available, otherwise wireframe
  const currentImage = imageUrls && imageUrls.length > 0
    ? imageUrls[Math.floor((angle / 360) * imageUrls.length) % imageUrls.length]
    : null

  return (
    <div
      className="relative flex aspect-video w-full cursor-grab select-none items-center justify-center overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#0f0f0f] active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(62,207,142,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(62,207,142,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Vehicle */}
      <div
        className="h-3/4 w-4/5"
        style={{ transform: `scaleX(${flipX ? -scaleX : scaleX})` }}
      >
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentImage} alt="vehicle exterior" className="h-full w-full object-contain" />
        ) : (
          <VehicleSilhouette />
        )}
      </div>

      {/* Ground shadow */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-full bg-[#3ecf8e]/5 blur-xl" />

      {/* Angle indicator */}
      <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
        <span className="rounded-full border border-[#2e2e2e] bg-[#0f0f0f]/80 px-3 py-1 text-[11px] text-[#4d4d4d]">
          {Math.round(angle)}° · drag to rotate
        </span>
      </div>

      {/* Pro badge */}
      <div className="pointer-events-none absolute right-3 top-3">
        <span className="rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 text-[10px] font-medium text-[#3ecf8e]">
          PRO · 360°
        </span>
      </div>
    </div>
  )
}
