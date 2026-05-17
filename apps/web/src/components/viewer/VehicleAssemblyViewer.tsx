'use client'
import { useEffect, useRef } from 'react'
import { setupAssemblyScene } from './assembly/scene'
import type { SceneHandle } from './assembly/scene'
interface Props { onReady: (h: SceneHandle) => void }
export default function VehicleAssemblyViewer({ onReady }: Props) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!el.current) return
    const h = setupAssemblyScene(el.current)
    onReady(h)
    return () => h.dispose()
  }, [onReady])
  return <div ref={el} className="w-full h-full" />
}
