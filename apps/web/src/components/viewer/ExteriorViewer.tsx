'use client'

import { useEffect, useRef, useState } from 'react'
import type { SignedMediaResponse } from '@decar/shared'

interface Props {
  vehicleId: string
}

export function ExteriorViewer({ vehicleId }: Props) {
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const isDragging = useRef(false)
  const startX = useRef(0)

  useEffect(() => {
    async function loadImages() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/vehicles/${vehicleId}/media?type=EXTERIOR_IMAGE`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: SignedMediaResponse[] }
        setImages(json.data.map((m) => m.url))
      } catch {
        // silently fall through to empty state
      } finally {
        setLoading(false)
      }
    }
    void loadImages()
  }, [vehicleId])

  function handleMouseDown(e: React.MouseEvent) {
    isDragging.current = true
    startX.current = e.clientX
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || images.length === 0) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > 10) {
      const direction = delta > 0 ? -1 : 1
      setCurrentIndex((i) => (i + direction + images.length) % images.length)
      startX.current = e.clientX
    }
  }

  function handleMouseUp() {
    isDragging.current = false
  }

  if (loading) {
    return (
      <div className="flex aspect-video w-full animate-pulse items-center justify-center rounded-xl bg-gray-100">
        <p className="text-sm text-gray-400">Loading exterior view…</p>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-50">
        <p className="text-sm text-gray-400">Exterior images not available.</p>
      </div>
    )
  }

  return (
    <div
      className="relative aspect-video w-full cursor-grab select-none overflow-hidden rounded-xl bg-gray-100 active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[currentIndex]}
        alt="Vehicle exterior"
        className="h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
        {currentIndex + 1} / {images.length}
      </div>
      <p className="absolute bottom-3 left-3 text-xs text-white/70">← drag to rotate →</p>
    </div>
  )
}
