'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  vehicleId: string
}

export function Engine3DViewer({ vehicleId }: Props) {
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function loadModel() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/vehicles/${vehicleId}/media?type=ENGINE_3D`,
          { credentials: 'include' },
        )
        if (!res.ok) throw new Error('Failed to load 3D model')
        const json = (await res.json()) as { data: { url: string } }
        setModelUrl(json.data.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void loadModel()
  }, [vehicleId])

  if (loading) {
    return (
      <div className="flex aspect-video w-full animate-pulse items-center justify-center rounded-xl bg-gray-100">
        <p className="text-sm text-gray-400">Loading 3D model…</p>
      </div>
    )
  }

  if (error || !modelUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-50">
        <p className="text-sm text-gray-400">3D model not available for this vehicle.</p>
      </div>
    )
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
      {/* model-viewer web component — loaded via script in layout */}
      {/* @ts-expect-error model-viewer is a custom element */}
      <model-viewer
        src={modelUrl}
        alt="3D engine model"
        auto-rotate
        camera-controls
        shadow-intensity="1"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
