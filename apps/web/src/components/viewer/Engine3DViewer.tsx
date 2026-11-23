'use client'

import { useEffect, useRef, useState } from 'react'
import type { SignedMediaResponse } from '@decar/shared'

// TypeScript declaration for the <model-viewer> web component (Google)
declare global {
  // Global JSX augmentation for a custom element can only be expressed as a namespace
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        'camera-controls'?: string
        'auto-rotate'?: string
        'shadow-intensity'?: string
        exposure?: string
        ar?: string
        alt?: string
      }
    }
  }
}

interface Props {
  vehicleId: string
  /** Pre-fetched GLB URL — overrides self-fetch when provided. */
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

export function Engine3DViewer({ vehicleId, modelUrl: initialModelUrl }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [resolvedModelUrl, setResolvedModelUrl] = useState<string | null>(initialModelUrl ?? null)
  const [modelViewerReady, setModelViewerReady] = useState(false)
  const startXRef = useRef(0)
  const startAngleRef = useRef(0)
  const rafRef = useRef<number>(0)

  // Self-fetch GLB URL if not pre-provided
  useEffect(() => {
    if (initialModelUrl || resolvedModelUrl) return
    fetch(`/api/media?vehicleId=${encodeURIComponent(vehicleId)}&type=ENGINE_3D`)
      .then((r) => r.json())
      .then((json: { data?: SignedMediaResponse[] }) => {
        const url = json.data?.[0]?.url
        if (url) setResolvedModelUrl(url)
      })
      .catch(() => undefined)
  }, [vehicleId, initialModelUrl, resolvedModelUrl])

  // Load @google/model-viewer from CDN when a GLB URL is ready
  useEffect(() => {
    if (!resolvedModelUrl) return
    if (document.querySelector('script[data-model-viewer]')) {
      setModelViewerReady(true)
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
    script.dataset.modelViewer = 'true'
    script.onload = () => setModelViewerReady(true)
    document.head.appendChild(script)
  }, [resolvedModelUrl])

  // Auto-rotate the SVG wireframe when no GLB is loaded
  useEffect(() => {
    if (resolvedModelUrl || isDragging) return
    const step = () => {
      setAngle((prev) => (prev + 0.4) % 360)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isDragging, resolvedModelUrl])

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

  // — Real 3D model via <model-viewer> —
  if (resolvedModelUrl && modelViewerReady) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#0f0f0f]">
        <model-viewer
          src={resolvedModelUrl}
          camera-controls=""
          auto-rotate=""
          shadow-intensity="1"
          exposure="0.8"
          alt={`3D engine model`}
          style={{ width: '100%', height: '100%' }}
        />
        <div className="pointer-events-none absolute right-3 top-3">
          <span className="rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 text-[10px] font-medium text-[#3ecf8e]">
            PRO · 3D
          </span>
        </div>
      </div>
    )
  }

  // — SVG wireframe fallback —
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
          {resolvedModelUrl ? 'Loading 3D model…' : 'drag to rotate'}
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
