"use client";

import dynamic from "next/dynamic";

const HeroScrub = dynamic(
  () => import("@/components/ui/hero-scrub").then((m) => m.HeroScrub),
  { ssr: false }
);

/**
 * Porsche 911 GT3 RS — cinematic scroll-scrubbed hero.
 *
 * frameUrl maps scroll progress → image.
 * We use 3 different high-res Unsplash Porsche 911 shots and cross-fade
 * between them across 90 "frames" so the scroll feels like a slow reveal
 * of the car from nose → side profile → rear quarter.
 *
 * Swap these for real sequential frame URLs (CDN-hosted JPEG strip) to
 * get the full Apple-style video-scrub effect.
 */

// Three iconic angles of the 911 GT3 RS
const SHOTS = [
  // Front 3/4 — classic Guards Red 911
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=90",
  // Side profile — silver 992
  "https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?auto=format&fit=crop&w=1920&q=90",
  // Rear quarter — night studio
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1920&q=90",
];

const FRAME_COUNT = SHOTS.length * 30; // 90 virtual frames, 30 per shot

function porscheFrameUrl(index: number): string {
  const shotIdx = Math.min(SHOTS.length - 1, Math.floor(index / 30));
  return SHOTS[shotIdx] as string;
}

export function Porsche911Hero() {
  return (
    <HeroScrub
      frameCount={FRAME_COUNT}
      frameUrl={porscheFrameUrl}
      titleTop="PORSCHE"
      titleBottom="911"
      bgClassName="bg-[#0A0A0C]"
      accentHex="#0E0B08"
      defaultAspect={16 / 9}
    />
  );
}