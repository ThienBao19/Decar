"use client"

import dynamic from "next/dynamic"

const HeroScrub = dynamic(
  () => import("@/components/ui/hero-scrub").then((m) => m.HeroScrub),
  { ssr: false }
)

// Six iconic car photographs — spread evenly across 120 virtual frames
// so the scroll feels like a slow reveal across different vehicles.
// Swap these for CDN-hosted sequential frame strips to get full video-scrub.
const SHOTS = [
  // Mercedes-AMG G63 — front 3/4 in desert
  "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1920&q=90",
  // Ferrari 488 — studio red
  "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1920&q=90",
  // Lamborghini Urus — side silhouette
  "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1920&q=90",
  // Porsche 911 GT3 — rear quarter
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=90",
  // BMW M4 Competition — front at dusk
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1920&q=90",
  // McLaren 720S — low angle
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=90",
]

const FRAMES_PER_SHOT = 20
const FRAME_COUNT = SHOTS.length * FRAMES_PER_SHOT // 120 frames total

function frameUrl(index: number): string {
  const shotIdx = Math.min(SHOTS.length - 1, Math.floor(index / FRAMES_PER_SHOT))
  return SHOTS[shotIdx] as string
}

export function VehicleShowcase() {
  return (
    <HeroScrub
      frameCount={FRAME_COUNT}
      frameUrl={frameUrl}
      titleTop="EVERY"
      titleBottom="VEHICLE"
      bgClassName="bg-[#0A0A0C]"
      accentHex="#0C0C10"
      defaultAspect={16 / 9}
    />
  )
}