'use client'
import { useState } from 'react'
import Image from 'next/image'

interface GalleryItem { url: string; label: string }

export function VehicleImageGallery({ images, alt }: { images: ReadonlyArray<GalleryItem>; alt: string }) {
  const [active, setActive] = useState(0)
  const [errSet, setErrSet] = useState<Set<number>>(new Set())
  const cur = images[active]
  if (!cur) return null

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#0f0f0f]">
        {errSet.has(active) ? (
          <div className="flex h-full items-center justify-center">
            <svg width="64" height="38" viewBox="0 0 500 220" fill="none" className="opacity-15">
              <path d="M60 155L60 120Q80 90 130 75L210 58Q250 48 290 58L370 75Q420 88 445 120L445 155A38 38 0 00407 155L170 155A38 38 0 00132 155Z" stroke="#fafafa" strokeWidth="8"/>
              <circle cx="380" cy="155" r="33" stroke="#fafafa" strokeWidth="8"/>
              <circle cx="127" cy="155" r="33" stroke="#fafafa" strokeWidth="8"/>
            </svg>
          </div>
        ) : (
          <Image src={cur.url} alt={`${alt} — ${cur.label}`} fill className="object-contain"
            sizes="(max-width:1024px)100vw,66vw" priority={active===0} unoptimized
            onError={() => setErrSet((s) => new Set([...s, active]))} />
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button key={img.label} onClick={() => setActive(i)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                i===active ? 'border-[#3ecf8e]/50 bg-[#3ecf8e]/10 text-[#3ecf8e]'
                  : 'border-[#2e2e2e] bg-[#1c1c1c] text-[#898989] hover:text-[#fafafa]'}`}>
              {img.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
