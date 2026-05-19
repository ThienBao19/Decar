import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NavbarClient } from './NavbarClient'

export async function Navbar() {
  const session = await getServerSession(authOptions)

  return (
    <header className="sticky top-0 z-50 border-b border-[#242424] bg-[#171717]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-[#fafafa]">
          {/* Green brand mark */}
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#3ecf8e]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1L12 4V10L7 13L2 10V4L7 1Z"
                stroke="#0f0f0f"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="7" cy="7" r="2" fill="#0f0f0f" />
            </svg>
          </span>
          <span className="text-[15px] font-medium tracking-tight">Decar</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/vehicles"
            className="text-[14px] font-medium text-[#898989] transition-colors hover:text-[#fafafa]"
          >
            Vehicles
          </Link>
          <Link
            href="/pricing"
            className="text-[14px] font-medium text-[#898989] transition-colors hover:text-[#fafafa]"
          >
            Pricing
          </Link>
          <Link
            href="/builder"
            className="text-[14px] font-medium text-[#898989] transition-colors hover:text-[#fafafa]"
          >
            Builder
          </Link>
        </nav>

        {/* Auth area */}
        <NavbarClient session={session} />
      </div>
    </header>
  )
}
