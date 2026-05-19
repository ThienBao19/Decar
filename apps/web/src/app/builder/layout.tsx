import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vehicle Builder - Decar',
  description: 'Build your custom vehicle, swap parts, then drive it or export as GLB.',
}

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}