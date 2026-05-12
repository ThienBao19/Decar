'use client'

import { Suspense, lazy } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8B9178]/30 border-t-[#8B9178]" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  )
}