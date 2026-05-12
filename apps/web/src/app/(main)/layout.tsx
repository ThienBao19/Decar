import dynamic from 'next/dynamic'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const DotGridBackground = dynamic(
  () => import('@/components/ui/dot-grid-background').then((m) => m.DotGridBackground),
  { ssr: false },
)

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <DotGridBackground />
      {/* z-10 so content paints above the fixed canvas (z-0) + vignette (z-1) */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
